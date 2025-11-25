// --- 게임 설정 ---
            let characters = [];
let monsters = {}; // 몬스터는 객체({}) 형태입니다!
let furnitureItems = [];
let eventDungeons = [];
let eventShopItems = [];
let mainStories = [];  // 추가
let eventStories = []; // 추가
let currentEventInfo = {};
let EVENT_CHARACTER_NAME = "";
let mainChapters = [];
let gachaPool = {}; // 가챠 등장 목록
let characterProfiles = {};
			// ==========================================
// 1. 아까 복사한 웹 앱 URL을 따옴표 안에 넣으세요
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyDuh6E_IdlyGs4zVSTUIwcBJD5MzCRfansKh8MHc_YfgKO7hnNxuuVAiVPRP0twweMPQ/exec";
// ==========================================

// 2. 데이터를 가져와서 characters 변수에 채워넣는 함수
async function loadGameData() {
    try {
        console.log("데이터 로딩 시작...");
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json(); // 전체 데이터 보따리를 받음

        // 1. 캐릭터 데이터 조립 (기존과 동일)
        characters = data.characters.map(row => ({
            name: row.name,
            baseName: row.baseName || row.name.split('] ')[1] || row.name,
            rarity: row.rarity,
            faction: row.faction,
            stats: { hp: Number(row.hp), atk: Number(row.atk), def: Number(row.def) },
            imageUrl: row.imageUrl,
            cardImageUrl: row.cardImageUrl || row.imageUrl,
            dialogues: row.dialogues ? String(row.dialogues).split('|') : ['...'],
            skills: [
                { name: row.skill1_name, dialogue: row.skill1_dialogue, power: Number(row.skill1_power), type: row.skill1_type },
                ...(row.skill2_name ? [{ name: row.skill2_name, dialogue: row.skill2_dialogue, power: Number(row.skill2_power), type: row.skill2_type }] : [])
            ],
            deathDialogue: row.deathDialogue,
            story: row.story,
            enhancementSuccessDialogue: row.enhancementSuccessDialogue
        }));

        // 2. 몬스터 데이터 조립 (배열을 객체로 변환: monsters['이름'] 형태)
        monsters = {}; // 초기화
        data.monsters.forEach(row => {
            monsters[row.key] = {
                name: row.name,
                stats: { hp: Number(row.hp), atk: Number(row.atk), def: Number(row.def) },
                imageUrl: row.imageUrl
            };
        });

        // 3. 가구 데이터 조립
        furnitureItems = data.furniture.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            size: { w: Number(row.w), h: Number(row.h) }, // w, h를 묶어서 size 객체로
            cost: Number(row.cost),
            scale: row.scale ? Number(row.scale) : undefined, // scale이 있으면 넣음
            imageUrl: row.imageUrl
        }));

        // 4. 이벤트 던전 조립
        eventDungeons = data.eventDungeons.map(row => ({
            name: row.name,
            monsterName: row.monsterName,
            eventPointReward: Number(row.eventPointReward)
        }));

        // 5. 이벤트 상점 조립 (itemData 연결 로직 필요)
        eventShopItems = data.eventShop.map(row => {
            // 카드인 경우 실제 캐릭터 데이터를 찾아 연결하고, 아니면 숫자 등을 그대로 씀
            let itemData = row.itemData;
            if (row.type === 'card') {
                // 캐릭터 이름으로 캐릭터 데이터 찾기 (데이터가 로드된 이후라 가능)
                const foundChar = characters.find(c => c.name === row.itemData);
                itemData = foundChar || row.itemData; // 못 찾으면 그냥 이름 둠 (에러 방지)
            } else {
                itemData = Number(row.itemData); // 보석 등은 숫자로 변환
            }

            return {
                id: row.id,
                name: row.name,
                type: row.type,
                cost: Number(row.cost),
                limit: Number(row.limit),
                itemData: itemData
            };
        });

		// 6. 메인 스토리 조립 (챕터별로 묶기)
        const rawMainStories = data.mainStories;
        mainStories = [];
        let currentMainChapter = null;
        let currentMainChapterId = -1;

        rawMainStories.forEach(row => {
            const chapterId = Number(row.chapter_id);
            
            // 새로운 챕터가 시작되면 챕터 객체를 만듭니다
            if (chapterId !== currentMainChapterId) {
                currentMainChapterId = chapterId;
                currentMainChapter = {
                    title: row.title,
                    dungeonToUnlock: (row.dungeonToUnlock && row.dungeonToUnlock !== "") ? row.dungeonToUnlock : null,
                    content: []
                };
                mainStories.push(currentMainChapter);
            }
            
            // 대사를 챕터의 content 배열에 추가합니다
            currentMainChapter.content.push({
                character: (row.character && row.character !== "") ? row.character : null,
                expression: row.expression,
                position: row.position,
                dialogue: row.dialogue
            });
        });

        // 7. 이벤트 스토리 조립 (방식은 메인 스토리와 동일)
        const rawEventStories = data.eventStories;
        eventStories = [];
        let currentEventChapter = null;
        let currentEventChapterId = -1;

        rawEventStories.forEach(row => {
            const chapterId = Number(row.chapter_id);
            
            if (chapterId !== currentEventChapterId) {
                currentEventChapterId = chapterId;
                currentEventChapter = {
                    title: row.title,
                    content: []
                };
                eventStories.push(currentEventChapter);
            }
            
            currentEventChapter.content.push({
                character: (row.character && row.character !== "") ? row.character : null,
                expression: row.expression,
                position: row.position,
                dialogue: row.dialogue
            });
        });

        console.log("스토리 데이터 로딩 완료!");

		// 8. 이벤트 정보 설정 (첫 번째 줄만 가져옴)
        if (data.eventInfo && data.eventInfo.length > 0) {
            const info = data.eventInfo[0]; // 1행 데이터
            currentEventInfo = {
                title: info.title,
                // 엑셀 날짜 텍스트를 자바스크립트 날짜 객체로 변환
                startDate: new Date(info.startDate),
                endDate: new Date(info.endDate),
                bannerImageUrl: info.bannerImageUrl,
                description: info.description,
                gachaCharacterName: info.gachaCharacterName
            };
            // 전역 변수 업데이트 (중요!)
            EVENT_CHARACTER_NAME = info.gachaCharacterName;
            
            console.log("이벤트 정보 로드:", currentEventInfo.title);
        }
		// 10. 가챠 등장 목록(Pool) 설정
        if (data.gachaPool) {
            gachaPool = {};
            data.gachaPool.forEach(row => {
                // gachaPool['캐릭터이름'] = { normal: true, event: false } 형태로 저장
                gachaPool[row.name] = {
                    normal: (row.in_normal === true || row.in_normal === 'TRUE' || row.in_normal === 1),
                    event: (row.in_event === true || row.in_event === 'TRUE' || row.in_event === 1)
                };
            });
            console.log("가챠 등장 목록 로드 완료");
        }

// 11. 스테이지 및 스테이지 스토리 조립 (복잡함 주의!)
        if (data.stages && data.stageStories) {
            const tempChapters = {}; // 챕터별로 모으기 위한 임시 저장소

            // (1) 스테이지 기본 정보 구성
            data.stages.forEach(row => {
                const chIdx = Number(row.chapter_index);
                const stIdx = Number(row.stage_index);

                // 해당 챕터가 처음 나오면 초기화
                if (!tempChapters[chIdx]) {
                    tempChapters[chIdx] = {
                        chapterName: row.chapter_name,
                        stages: []
                    };
                }

                // 스테이지 객체 생성 (스토리는 아직 비워둠)
                tempChapters[chIdx].stages[stIdx] = {
                    stageName: row.stage_name,
                    monsterName: row.monster_name,
                    rewards: {
                        fountainPens: Number(row.reward_fp),
                        currency: Number(row.reward_cur)
                    },
                    stageStory: [] // 여기에 스토리를 채울 예정
                };
            });

            // (2) 스테이지 스토리 채워넣기
            data.stageStories.forEach(row => {
                const chIdx = Number(row.chapter_index);
                const stIdx = Number(row.stage_index);

                // 해당하는 스테이지가 존재하면 대사 추가
                if (tempChapters[chIdx] && tempChapters[chIdx].stages[stIdx]) {
                    tempChapters[chIdx].stages[stIdx].stageStory.push({
                        character: (row.character && row.character !== "") ? row.character : null,
                        expression: row.expression,
                        position: row.position,
                        dialogue: row.dialogue
                    });
                }
            });

            // (3) 최종적으로 mainChapters 배열로 변환 (인덱스 순서대로)
            mainChapters = [];
            const sortedChapterKeys = Object.keys(tempChapters).sort((a, b) => a - b);
            
            sortedChapterKeys.forEach(key => {
                // 각 챕터의 스테이지 배열도 빈 구멍 없이 정리
                const chapterObj = tempChapters[key];
                // 구멍 난 인덱스(예: 0, 2만 있고 1이 없는 경우) 방지 필터링
                chapterObj.stages = chapterObj.stages.filter(s => s !== undefined);
                mainChapters.push(chapterObj);
            });

            console.log("메인 챕터 & 스테이지 스토리 로드 완료");
        }
		
		// 12. 캐릭터 프로필(도감용) 로드
        if (data.profiles) {
            characterProfiles = {}; 
            data.profiles.forEach(row => {
                characterProfiles[row.baseName] = {
                    name: row.name,
                    age: row.age,
                    job: row.job,
                    description: row.description,
                    imageUrl: row.imageUrl,
                    group: row.group || '기타' // [추가] 기수 정보 가져오기 (없으면 '기타')
                };
            });
            console.log("캐릭터 프로필 로드 완료");
        }
		
        console.log("모든 데이터 로딩 완료!");

    } catch (error) {
        console.error("데이터 로딩 실패:", error);
        alert("데이터를 불러오지 못했습니다. " + error.message);
    }
}
            
            

            


// ✅ 1단계: 아래 코드를 game_data.js 파일에 추가하세요.

// [이 코드로 기존 const eventStoryPart2 = {...} 블록 전체를 교체하세요]
const eventStoryPart2 = {
    // --- 전반부 스토리 (선택지 때문에 이 부분은 필요합니다) ---
    firstHalf: [
        // 장면 0
        {
            character: '서도진', expression: 'serious', position: 'left',
            dialogue: '사건 현장에서 두 개의 결정적인 증거가 나왔어. 하나는 피해자의 다잉 메시지, 다른 하나는... 용의자의 지문이 묻은 찻잔이야.'
        },
        // 장면 1
        {
            character: '도천영', expression: 'neutral', position: 'right',
            dialogue: '데이터는 거짓말을 하지 않죠. 하지만 다잉 메시지는 해석의 여지가 있고, 지문은 조작될 수 있습니다.'
        },
        // 장면 2
        {
            character: null,
            dialogue: '두 개의 상반된 단서. 어떤 것을 더 신뢰해야 할까?'
        },
        // 장면 3 (선택지)
        {
            character: '서도진', expression: 'neutral', position: 'left',
            dialogue: '이제 선택해야 해. 어떤 증거를 중심으로 수사를 진행할지...',
            choices: [
                { text: '다잉 메시지를 믿는다.', nextScene: 4 },
                { text: '결정적인 지문을 믿는다.', nextScene: 5 }
            ]
        },
        // 장면 4 (분기 1: 다잉 메시지)
        {
            character: null,
            dialogue: '당신은 피해자가 마지막 힘을 다해 남긴 메시지에 더 무게를 두기로 했다.',
            jumpTo: 6 
        },
        // 장면 5 (분기 2: 지문)
        {
            character: null,
            dialogue: '당신은 과학적이고 물리적인 증거인 지문을 더 신뢰하기로 했다.',
            jumpTo: 6 
        },
        // 장면 6 (공통 장면)
        {
            character: '서도진', expression: 'serious', position: 'left',
            dialogue: '좋아, 그 방향으로 수사를 진행하지. 우리의 선택이 어떤 결과로 이어질지는... 아직 아무도 몰라.',
            choices: [
                {
                    text: '전반부 스토리 완료',
                    statId: 'event_part2_final_choice',
                    isFinalChoice: true
                }
            ]
        }
    ],
    // --- 후반부 스토리 (미니 이벤트이므로 비워둡니다) ---
    secondHalf: [] // <--- 이 부분을 빈 배열로 만듭니다.
};

            


            // ✅ 이 코드로 기존 mainStories 변수 전체를 교체해주세요.
        

            // --- 업적 데이터 (수정 및 보상 추가) ---
            const achievements = [
                // 1. 뽑기 관련
                { id: 'ach_001', title: '첫걸음', description: '누군가의 서고에서 1회 뽑기', condition: (state) => state.stats.totalPulls >= 1, reward: { currency: 10 } },
                { id: 'ach_002', title: '수집의 시작', description: '누군가의 서고에서 10회 뽑기', condition: (state) => state.stats.totalPulls >= 10, reward: { currency: 50 } },
                { id: 'ach_003', title: '대량 집필', description: '누군가의 서고에서 50회 뽑기', condition: (state) => state.stats.totalPulls >= 50, reward: { currency: 100 } },
                
                // 2. 카드 획득 관련
                { id: 'ach_004', title: '인연의 실', description: '등장인물 10종류 수집', condition: (state) => new Set(state.inventory.map(c => c.name)).size >= 10, reward: { currency: 50 } },
                { id: 'ach_005', title: '탐정의 자질', description: 'SSR 등급 등장인물 1장 획득', condition: (state) => state.inventory.some(c => c.rarity === 'SSR'), reward: { currency: 100 } },
                
                // 3. 성장/육성 관련
                { id: 'ach_007', title: '퇴고의 기본', description: '등장인물을 1회 퇴고하기', condition: (state) => state.inventory.some(c => c.level >= 1), reward: { fountainPens: 50 } }, // ✨ 보상 추가 (만년필 50개)
                { id: 'ach_008', title: '개정판 입문', description: '개정 레벨이 1 이상인 카드 1장 보유', condition: (state) => state.inventory.some(c => c.revision >= 1), reward: { currency: 70 } },
                { id: 'ach_009', title: '최고의 필력', description: 'SSR 카드를 최대 레벨(+9)까지 퇴고', condition: (state) => state.inventory.some(c => c.rarity === 'SSR' && c.level >= 9), reward: { currency: 200 } },
                
                // 4. 전투/스테이지 관련
                { id: 'ach_010', title: '첫 독서', description: '스테이지 1-1 클리어', condition: (state) => state.clearedStages.includes('1-1'), reward: { fountainPens: 50 } }, // ✨ 보상 추가 (만년필 50개)
                { id: 'ach_011', title: '1장 완독', description: '제1장(1-10) 모두 클리어', condition: (state) => state.clearedStages.includes('1-10'), reward: { bookmarks: 5 } },
                { id: 'ach_012', title: '2장 완독', description: '제2장(2-10) 모두 클리어', condition: (state) => state.clearedStages.includes('2-10'), reward: { bookmarks: 10 } },
                
                // 5. 기타 기능/재화 관련
                { id: 'ach_013', title: '넓어진 서재', description: '보관함 1회 확장', condition: (state) => state.capacity > 100, reward: { currency: 30 } },
                { id: 'ach_014', title: '잉크 부자', description: '만년필 1,000개 이상 보유', condition: (state) => state.fountainPens >= 1000, reward: { currency: 100 } },
            ];
			
			// --- 인연(Synergy) 데이터 ---
            const synergies = [
                {
                    name: '탐정과 조수',
                    description: '덱 전체 HP +10%',
                    condition: (deck) => deck.some(c => c.faction === '탐정') && deck.some(c => c.faction === '조수'),
                    applyBonus: (card) => { card.stats.hp = Math.floor(card.stats.hp * 1.10); }
                },
                {
                    name: '쫓는 자와 쫓기는 자',
                    description: '덱 전체 ATK +10%',
                    condition: (deck) => deck.some(c => c.faction === '탐정') && deck.some(c => c.faction === '범인'),
                    applyBonus: (card) => { card.stats.atk = Math.floor(card.stats.atk * 1.10); }
                },
                {
                    name: '편집자와 소설가',
                    description: '서도진 & 윤필규 ATK +15',
                    condition: (deck) => deck.some(c => c.baseName === '서도진') && deck.some(c => c.baseName === '윤필규'),
                    applyBonus: (card) => { if (card.baseName === '서도진' || card.baseName === '윤필규') card.stats.atk += 15; }
                },
                {
                    name: '우애 나쁜 형제',
                    description: '윤필규 & 윤서천 DEF +15',
                    condition: (deck) => deck.some(c => c.baseName === '윤필규') && deck.some(c => c.baseName === '윤서천'),
                    applyBonus: (card) => { if (card.baseName === '윤필규' || card.baseName === '윤서천') card.stats.def += 15; }
                },
                {
                    name: '저 없으면 안 되죠?',
                    description: '서도진 & 한 현 HP +20%',
                    condition: (deck) => deck.some(c => c.baseName === '서도진') && deck.some(c => c.baseName === '한 현'),
                    applyBonus: (card) => { if (card.baseName === '서도진' || card.baseName === '한 현') card.stats.hp = Math.floor(card.stats.hp * 1.20); }
                },
                {
                    name: '눈앞에서 사람이 떨어졌다',
                    description: '윤서천 & 도천영 ATK +12%',
                    condition: (deck) => deck.some(c => c.baseName === '윤서천') && deck.some(c => c.baseName === '도천영'),
                    applyBonus: (card) => { if (card.baseName === '윤서천' || card.baseName === '도천영') card.stats.atk = Math.floor(card.stats.atk * 1.12); }
                },
                {
                    name: '목숨줄을 붙잡고 계시니까요',
                    description: '독고유진 & 양석민 DEF +20%',
                    condition: (deck) => deck.some(c => c.baseName === '독고유진') && deck.some(c => c.baseName === '양석민'),
                    applyBonus: (card) => { if (card.baseName === '독고유진' || card.baseName === '양석민') card.stats.def = Math.floor(card.stats.def * 1.20); }
                },
                {
                    name: '너무 티나는 짝사랑',
                    description: '박연우 & 강은율 HP/DEF +10%',
                    condition: (deck) => deck.some(c => c.baseName === '박연우') && deck.some(c => c.baseName === '강은율'),
                    applyBonus: (card) => {
                        if (card.baseName === '박연우' || card.baseName === '강은율') {
                            card.stats.hp = Math.floor(card.stats.hp * 1.10);
                            card.stats.def = Math.floor(card.stats.def * 1.10);
                        }
                    }
                }
            ];
			
			// --- 캐릭터 표정 이미지 데이터 ---
            const characterPortraits = {
                '서도진': {
                    neutral: 'https://i.imgur.com/9AoLI6I.png',
                    serious: 'https://i.imgur.com/ERUGX0P.png',
                    surprised: 'https://i.imgur.com/IayOWqf.png',
                    angry: 'https://i.imgur.com/ERUGX0P.png',
                },
                '도천영': {
                    neutral: 'https://i.imgur.com/svV5WKn.png',
                    serious: 'https://i.imgur.com/HlApnIL.png',
                },
                '윤필규': {
                    neutral: 'https://i.imgur.com/x6rfl1m.png'
                },
                '강은율': {
                    neutral: 'https://placehold.co/400x800/0bc5ea/ffffff?text=강은율',
                    serious: 'https://placehold.co/400x800/0987a0/ffffff?text=강은율'
                },
                '박연우': {
                    neutral: 'https://placehold.co/400x800/dd6b20/ffffff?text=박연우'
                },
                '백정문': {
                    neutral: 'https://placehold.co/400x800/f687b3/ffffff?text=백정문',
                    serious: 'https://placehold.co/400x800/d53f8c/ffffff?text=백정문'
                },
                '양석민': {
                    neutral: 'https://placehold.co/400x800/2f855a/ffffff?text=양석민',
                    serious: 'https://placehold.co/400x800/22543d/ffffff?text=양석민'
                },
                '독고유진': {
                    neutral: 'https://placehold.co/400x800/805ad5/ffffff?text=독고유진',
                    serious: 'https://placehold.co/400x800/553c9a/ffffff?text=독고유진'
                },
                '윤서천': {
                    neutral: 'https://i.imgur.com/Ruo7GXd.png',
                    serious: 'https://i.imgur.com/L6RdFz9.png'
                },
                '한 현': {
                    neutral: 'https://i.imgur.com/0F4cRdF.png'
                },
                '윤유준': {
                    neutral: 'https://placehold.co/400x800/c53030/ffffff?text=윤유준',
                    surprised: 'https://placehold.co/400x800/e53e3e/ffffff?text=윤유준'
                },
				'선생': { 
                    neutral: 'https://placehold.co/400x800/8B4513/ffffff?text=선생'
                },
                // 👇 [신규 추가 2]
                '백도화': {
                    neutral: 'https://placehold.co/400x800/FFC0CB/000000?text=백도화'
                }
            };
			
			const rarityProbabilities = { 'SSR': 3, 'SR': 12, 'R': 35, 'N': 50 };
            const eventRarityProbabilities = { 'SSR': 6, 'SR': 14, 'R': 30, 'N': 50 };
            
			// --- 강화(퇴고) 비용 설정 ---

// 레벨 0->1, 1->2, ..., 8->9로 갈 때 필요한 만년필의 기본 비용
// (기존의 ENHANCEMENT_COSTS 배열을 대체합니다)
const ENHANCEMENT_BASE_COSTS = [5, 10, 15, 25, 40, 60, 85, 115, 150];

// 등급별 비용 배율 (N등급이 기준 1.0)
const RARITY_COST_MULTIPLIER = {
    'N': 0.7,   // N등급: 기준 비용의 70% 소모 (가장 저렴)
    'R': 1.0,   // R등급: 기준 비용의 100% 소모 (기준)
    'SR': 1.3,  // SR등급: 기준 비용의 130% 소모
    'SSR': 1.6, // SSR등급: 기준 비용의 160% 소모 (가장 비쌈)
};

// 기존에 있던 ENHANCEMENT_COSTS 또는 enhancementCosts 변수는 삭제하거나 주석 처리해야 합니다.
// (만약 있다면 삭제하세요): const ENHANCEMENT_COSTS = [5, 10, 15, 25, 40, 60, 85, 115, 150];
// (만약 있다면 삭제하세요): const enhancementCosts = [10, 20, 35, 55, 80, 110, 150, 200, 250];

// 나머지 게임 설정 데이터는 그대로 유지합니다.

// ✅ game_data.js 파일 맨 아래에 이 코드를 통째로 추가하세요.



const CURRENT_EVENT_ID = "mini_event_202510_dohwa";


// game_data.js



// --- 캐릭터 SD 이미지 매핑 (없으면 기본 카드 이미지나 플레이스홀더 사용) ---
// 실제 게임에서는 배경이 투명한 귀여운 SD 캐릭터 이미지가 필요합니다.
const chibiImages = {
    '서도진': 'https://i.imgur.com/2N9aikK.png',
    '윤필규': 'https://i.imgur.com/25130ai.png',
	'한 현': 'https://i.imgur.com/mK2Hbzp.png',
	'윤서천': 'https://i.imgur.com/G28HUhv.png',
	'도천영': 'https://i.imgur.com/smQIEQD.png',
    // ... 나머지 캐릭터들도 추가
};



// 캐릭터 상호작용 대사 데이터
const interactionDialogues = [
    {
        pair: ['서도진', '윤필규'],
        dialogues: [
            ['마감은... 지키고 계시죠?', '아, 지금 하러 가려던 참이야...'],
            ['작가님, 식사는 하셨나요?', '아니, 원고 쓰느라 아직...'],
            ['원고 잊지 않으셨죠?', '으윽... 알았다니까.']
        ]
    },
    {
        pair: ['서도진', '한 현'],
        dialogues: [
            ['그 사건, 좀 이상하지 않아?', '네, 저도 그렇게 생각해요.'],
            ['현아, 서점에 신간 들어왔어?', '작가님 책은 제일 잘 보이는 곳에 뒀어요.']
        ]
    },
    {
        pair: ['윤서천', '도천영'],
        dialogues: [
            ['흥미로운 데이터가 나왔네요.', '그래? 보여줘 봐.'],
            ['이 시약은 위험하지 않아요?', '통제만 잘하면 완벽한 도구지.']
        ]
    },
    // 특정 파트너가 없을 때의 범용 대사 (pair를 null로 처리하거나 별도 로직 사용)
];

// 범용 상호작용 대사 (쌍이 맞지 않을 때 사용)
const genericInteractions = [
    ['오늘 날씨가 좋네요.', '그러게 말입니다.'],
    ['사건 조사는 잘 돼가나요?', '쉽지 않네요.'],
    ['안녕하세요!', '반갑습니다.']
];
































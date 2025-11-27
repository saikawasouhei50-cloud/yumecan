// --- 게임 설정 ---
let characters = [];
let monsters = {}; 
let furnitureItems = [];
let eventDungeons = [];
let eventShopItems = [];
let mainStories = [];
let eventStories = [];
let currentEventInfo = {};
let EVENT_CHARACTER_NAME = "";
let mainChapters = [];
let gachaPool = {}; 
let characterProfiles = {};
let interactionDialogues = [];

// ✨ [변경] 인연 데이터는 이제 시트에서 불러오므로 초기값은 빈 배열입니다.
let synergies = []; 
let chibiImages = {};

// ==========================================
// 1. 웹 앱 URL (배포 후 바뀐 URL이 있다면 꼭 갱신해주세요!)
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz-CLiFv2lgxMr0ckkKP4uP-CihTYmxkBX2S88MlH0d6sOavXQ6DHrE32b86R9ywDCR0A/exec";
// ==========================================

// 2. 데이터를 가져와서 변수에 채워넣는 함수
async function loadGameData() {
    try {
        console.log("데이터 로딩 시작...");
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json(); 

        // 1. 캐릭터 데이터 조립
        chibiImages = {}; 

        characters = data.characters.map(row => {
            const calculatedBaseName = row.baseName || row.name.split('] ')[1] || row.name;

            if (row.chibi_image && row.chibi_image !== "") {
                chibiImages[calculatedBaseName] = row.chibi_image;
            }

            return {
                name: row.name,
                baseName: calculatedBaseName,
                faction: row.faction, 
                rarity: row.rarity,
				publishTarget: row.publish_target,
                
                // ✨ [누락된 부분 추가] 아래 줄을 꼭 넣어주세요! ✨
                stats: { hp: Number(row.hp), atk: Number(row.atk), def: Number(row.def) },
                // ... (기존 코드 유지) ...
                imageUrl: row.imageUrl,
                cardImageUrl: row.cardImageUrl || row.imageUrl,
                
                // 캐릭터 객체 자체에도 정보를 넣어두면 좋습니다 (선택사항)
                chibiImageUrl: row.chibi_image || row.cardImageUrl || row.imageUrl, 

                dialogues: row.dialogues ? String(row.dialogues).split('|') : ['...'],
                // ... (나머지 스킬, 대사 등 기존 코드 유지) ...
                skills: [
                    { name: row.skill1_name, dialogue: row.skill1_dialogue, power: Number(row.skill1_power), type: row.skill1_type },
                    ...(row.skill2_name ? [{ name: row.skill2_name, dialogue: row.skill2_dialogue, power: Number(row.skill2_power), type: row.skill2_type }] : [])
                ],
                deathDialogue: row.deathDialogue,
                story: row.story,
                enhancementSuccessDialogue: row.enhancementSuccessDialogue
            };
        });

        // 2. 몬스터 데이터 조립
        monsters = {}; 
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
            size: { w: Number(row.w), h: Number(row.h) }, 
            cost: Number(row.cost),
            scale: row.scale ? Number(row.scale) : undefined, 
            imageUrl: row.imageUrl
        }));

        // 4. 이벤트 던전 조립
        eventDungeons = data.eventDungeons.map(row => ({
            name: row.name,
            monsterName: row.monsterName,
            eventPointReward: Number(row.eventPointReward)
        }));

        // 5. 이벤트 상점 조립
        eventShopItems = data.eventShop.map(row => {
            let itemData = row.itemData;
            if (row.type === 'card') {
                const foundChar = characters.find(c => c.name === row.itemData);
                itemData = foundChar || row.itemData; 
            } else {
                itemData = Number(row.itemData); 
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

		// 6. 메인 스토리 조립
        const rawMainStories = data.mainStories;
        mainStories = [];
        let currentMainChapter = null;
        let currentMainChapterId = -1;

        rawMainStories.forEach(row => {
            const chapterId = Number(row.chapter_id);
            if (chapterId !== currentMainChapterId) {
                currentMainChapterId = chapterId;
                currentMainChapter = {
                    title: row.title,
                    dungeonToUnlock: (row.dungeonToUnlock && row.dungeonToUnlock !== "") ? row.dungeonToUnlock : null,
                    content: []
                };
                mainStories.push(currentMainChapter);
            }
            currentMainChapter.content.push({
                character: (row.character && row.character !== "") ? row.character : null,
                expression: row.expression,
                position: row.position,
                dialogue: row.dialogue
            });
        });

        // 7. 이벤트 스토리 조립
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

		// 8. 이벤트 정보 설정
        if (data.eventInfo && data.eventInfo.length > 0) {
            const info = data.eventInfo[0]; 
            currentEventInfo = {
                title: info.title,
                startDate: new Date(info.startDate),
                endDate: new Date(info.endDate),
                bannerImageUrl: info.bannerImageUrl,
                description: info.description,
                gachaCharacterName: info.gachaCharacterName
            };
            EVENT_CHARACTER_NAME = info.gachaCharacterName;
        }

		// 10. 가챠 등장 목록(Pool) 설정
        if (data.gachaPool) {
            gachaPool = {};
            data.gachaPool.forEach(row => {
                gachaPool[row.name] = {
                    normal: (row.in_normal === true || row.in_normal === 'TRUE' || row.in_normal === 1),
                    event: (row.in_event === true || row.in_event === 'TRUE' || row.in_event === 1)
                };
            });
        }

        // 11. 스테이지 및 스테이지 스토리 조립
        if (data.stages && data.stageStories) {
            const tempChapters = {}; 
            data.stages.forEach(row => {
                const chIdx = Number(row.chapter_index);
                const stIdx = Number(row.stage_index);
                if (!tempChapters[chIdx]) {
                    tempChapters[chIdx] = {
                        chapterName: row.chapter_name,
                        stages: []
                    };
                }
                tempChapters[chIdx].stages[stIdx] = {
                    stageName: row.stage_name,
                    monsterName: row.monster_name,
                    rewards: {
                        fountainPens: Number(row.reward_fp),
                        currency: Number(row.reward_cur)
                    },
                    stageStory: [] 
                };
            });

            data.stageStories.forEach(row => {
                const chIdx = Number(row.chapter_index);
                const stIdx = Number(row.stage_index);
                if (tempChapters[chIdx] && tempChapters[chIdx].stages[stIdx]) {
                    tempChapters[chIdx].stages[stIdx].stageStory.push({
                        character: (row.character && row.character !== "") ? row.character : null,
                        expression: row.expression,
                        position: row.position,
                        dialogue: row.dialogue
                    });
                }
            });

            mainChapters = [];
            const sortedChapterKeys = Object.keys(tempChapters).sort((a, b) => a - b);
            sortedChapterKeys.forEach(key => {
                const chapterObj = tempChapters[key];
                chapterObj.stages = chapterObj.stages.filter(s => s !== undefined);
                mainChapters.push(chapterObj);
            });
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
                    group: row.group || '기타' 
                };
            });
        }

        // ✨✨✨ 13. [신규] 인연(Synergy) 데이터 조립 ✨✨✨
        // 구글 시트의 텍스트 데이터를 실제 게임 로직(함수)으로 변환합니다.
        if (data.synergies) {
            synergies = data.synergies.map(row => {
                return {
                    name: row.name,
                    description: row.description,
                    
                    // (A) 조건 검사 함수 생성 (condition)
                    // 시트의 'req1', 'req2' 컬럼에 적힌 진영이나 캐릭터 이름이 덱에 있는지 검사합니다.
                    condition: (deck) => {
                        if (row.type === 'faction') {
                            // 진영 조건: req1 진영과 req2 진영을 가진 카드가 모두 있는지 확인
                            const hasReq1 = deck.some(c => c.faction === row.req1);
                            const hasReq2 = deck.some(c => c.faction === row.req2);
                            return hasReq1 && hasReq2;
                        } else if (row.type === 'character') {
                            // 캐릭터 이름 조건: req1 캐릭터와 req2 캐릭터가 모두 있는지 확인
                            const hasReq1 = deck.some(c => c.baseName === row.req1);
                            const hasReq2 = deck.some(c => c.baseName === row.req2);
                            return hasReq1 && hasReq2;
                        }
                        return false;
                    },

                    // (B) 보너스 적용 함수 생성 (applyBonus)
                    // 시트의 'target', 'stat', 'value', 'method' 컬럼에 따라 능력치를 올려줍니다.
                    applyBonus: (card) => {
                        // 1. 이 카드가 보너스 적용 대상인지 확인
                        let isTarget = false;
                        if (row.target === 'all') {
                            isTarget = true; // 덱 전체 적용
                        } else if (row.target === 'self') {
                            // 조건에 부합하는 당사자들만 적용
                            if (row.type === 'character') {
                                isTarget = (card.baseName === row.req1 || card.baseName === row.req2);
                            } else if (row.type === 'faction') {
                                isTarget = (card.faction === row.req1 || card.faction === row.req2);
                            }
                        }

                        // 2. 대상이라면 능력치 증가
                        if (isTarget) {
                            const val = Number(row.value); // 증가량
                            const statKey = row.stat;      // 'hp', 'atk', 'def' 중 하나

                            if (row.method === 'multiply') {
                                // 퍼센트 증가 (예: 1.1 = 10% 증가) -> 곱하기
                                card.stats[statKey] = Math.floor(card.stats[statKey] * val);
                            } else if (row.method === 'add') {
                                // 고정값 증가 (예: 15) -> 더하기
                                card.stats[statKey] += val;
                            }
                        }
                    }
                };
            });
            console.log("인연 데이터 로드 완료:", synergies.length, "개");
        } else {
            console.log("인연 데이터가 시트에 없습니다. (빈 배열)");
            synergies = [];
        }

		// 13. 마이룸 상호작용 대사 조립
        if (data.interactions) {
            interactionDialogues = [];
            
            // 시트의 각 줄을 읽어서 게임 데이터 구조로 변환
            // 구조: { pair: ['A', 'B'], dialogues: [['대사1', '대사2'], ['대사3', '대사4']] }
            
            const tempMap = {}; // 정리를 위한 임시 저장소

            data.interactions.forEach(row => {
                // 키 생성 (이름 순서 상관없이 묶기 위해 정렬 사용)
                const pairKey = [row.char1, row.char2].sort().join('_');
                
                if (!tempMap[pairKey]) {
                    tempMap[pairKey] = {
                        pair: [row.char1, row.char2], // 원본 이름 저장
                        dialogues: []
                    };
                }
                
                // 대사 쌍 추가
                tempMap[pairKey].dialogues.push([row.dialogue1, row.dialogue2]);
            });

            // 객체를 배열로 변환하여 최종 저장
            interactionDialogues = Object.values(tempMap);
            console.log("상호작용 대사 로드 완료");
        }
		
        console.log("모든 데이터 로딩 완료!");

    } catch (error) {
        console.error("데이터 로딩 실패:", error);
        alert("데이터를 불러오지 못했습니다. " + error.message);
    }
}


// --- 아래는 하드코딩된 데이터(이벤트 스토리 등)를 유지합니다 ---
// (synergies 변수는 위에서 로드하므로 여기서 지웁니다)

const eventStoryPart2 = {
    firstHalf: [
        {
            character: '서도진', expression: 'serious', position: 'left',
            dialogue: '사건 현장에서 두 개의 결정적인 증거가 나왔어. 하나는 피해자의 다잉 메시지, 다른 하나는... 용의자의 지문이 묻은 찻잔이야.'
        },
        {
            character: '도천영', expression: 'neutral', position: 'right',
            dialogue: '데이터는 거짓말을 하지 않죠. 하지만 다잉 메시지는 해석의 여지가 있고, 지문은 조작될 수 있습니다.'
        },
        {
            character: null,
            dialogue: '두 개의 상반된 단서. 어떤 것을 더 신뢰해야 할까?'
        },
        {
            character: '서도진', expression: 'neutral', position: 'left',
            dialogue: '이제 선택해야 해. 어떤 증거를 중심으로 수사를 진행할지...',
            choices: [
                { text: '다잉 메시지를 믿는다.', nextScene: 4 },
                { text: '결정적인 지문을 믿는다.', nextScene: 5 }
            ]
        },
        {
            character: null,
            dialogue: '당신은 피해자가 마지막 힘을 다해 남긴 메시지에 더 무게를 두기로 했다.',
            jumpTo: 6 
        },
        {
            character: null,
            dialogue: '당신은 과학적이고 물리적인 증거인 지문을 더 신뢰하기로 했다.',
            jumpTo: 6 
        },
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
    secondHalf: [] 
};

const achievements = [
    { id: 'ach_001', title: '첫걸음', description: '누군가의 서고에서 1회 뽑기', condition: (state) => state.stats.totalPulls >= 1, reward: { currency: 10 } },
    { id: 'ach_002', title: '수집의 시작', description: '누군가의 서고에서 10회 뽑기', condition: (state) => state.stats.totalPulls >= 10, reward: { currency: 50 } },
    { id: 'ach_003', title: '대량 집필', description: '누군가의 서고에서 50회 뽑기', condition: (state) => state.stats.totalPulls >= 50, reward: { currency: 100 } },
    { id: 'ach_004', title: '인연의 실', description: '등장인물 10종류 수집', condition: (state) => new Set(state.inventory.map(c => c.name)).size >= 10, reward: { currency: 50 } },
    { id: 'ach_005', title: '탐정의 자질', description: 'SSR 등급 등장인물 1장 획득', condition: (state) => state.inventory.some(c => c.rarity === 'SSR'), reward: { currency: 100 } },
    { id: 'ach_007', title: '퇴고의 기본', description: '등장인물을 1회 퇴고하기', condition: (state) => state.inventory.some(c => c.level >= 1), reward: { fountainPens: 50 } }, 
    { id: 'ach_008', title: '개정판 입문', description: '개정 레벨이 1 이상인 카드 1장 보유', condition: (state) => state.inventory.some(c => c.revision >= 1), reward: { currency: 70 } },
    { id: 'ach_009', title: '최고의 필력', description: 'SSR 카드를 최대 레벨(+9)까지 퇴고', condition: (state) => state.inventory.some(c => c.rarity === 'SSR' && c.level >= 9), reward: { currency: 200 } },
    { id: 'ach_010', title: '첫 독서', description: '스테이지 1-1 클리어', condition: (state) => state.clearedStages.includes('1-1'), reward: { fountainPens: 50 } }, 
    { id: 'ach_011', title: '1장 완독', description: '제1장(1-10) 모두 클리어', condition: (state) => state.clearedStages.includes('1-10'), reward: { bookmarks: 5 } },
    { id: 'ach_012', title: '2장 완독', description: '제2장(2-10) 모두 클리어', condition: (state) => state.clearedStages.includes('2-10'), reward: { bookmarks: 10 } },
    { id: 'ach_013', title: '넓어진 서재', description: '보관함 1회 확장', condition: (state) => state.capacity > 100, reward: { currency: 30 } },
    { id: 'ach_014', title: '잉크 부자', description: '만년필 1,000개 이상 보유', condition: (state) => state.fountainPens >= 1000, reward: { currency: 100 } },
];

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
    '백도화': {
        neutral: 'https://placehold.co/400x800/FFC0CB/000000?text=백도화'
    }
};

const rarityProbabilities = { 'SSR': 3, 'SR': 12, 'R': 35, 'N': 50 };
const eventRarityProbabilities = { 'SSR': 6, 'SR': 14, 'R': 30, 'N': 50 };

const ENHANCEMENT_BASE_COSTS = [5, 10, 15, 25, 40, 60, 85, 115, 150];
const RARITY_COST_MULTIPLIER = {
    'N': 0.7,   
    'R': 1.0,   
    'SR': 1.3,  
    'SSR': 1.6, 
};

const CURRENT_EVENT_ID = "mini_event_202510_dohwa";

// yumecan_data.js 파일 맨 끝부분에 추가하세요.

// 범용 상호작용 대사 (쌍이 맞지 않을 때 사용하는 기본 대사)
const genericInteractions = [
    ['오늘 날씨가 좋네요.', '그러게 말입니다.'],
    ['사건 조사는 잘 돼가나요?', '쉽지 않네요.'],
    ['안녕하세요!', '반갑습니다.'],
    ['잠시 쉬었다 갈까요?', '좋은 생각입니다.']
];






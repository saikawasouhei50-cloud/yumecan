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
let interactionDialogues = {};
let systemMails = [];
let raidBossDataSheet = null;
let allEventInfos = []; // ✨ [추가] 모든 이벤트 목록 저장용

// ✨ [변경] 인연 데이터는 이제 시트에서 불러오므로 초기값은 빈 배열입니다.
let synergies = []; 
let chibiImages = {};
let CURRENT_EVENT_ID = null; 

// ==========================================
// 1. 웹 앱 URL (여기에만 최신 주소를 적으세요!)
// ==========================================
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby0Tq97edWMchBrVf10sr233P33UMlKFdMsxWvA94eeM7VQ8A10ejyDTGgOf34CoY5TVg/exec";

// 2. 데이터를 가져와서 변수에 채워넣는 함수
async function loadGameData() {
    try {
        console.log("데이터 로딩 시작...");
		function parseDate(dateStr) {
    if (!dateStr) return null;
    // 구글 시트가 "2023-10-25 14:30:00" 처럼 줄 경우
    // "2023-10-25T14:30:00" 으로 바꿔주면 브라우저가 시간을 정확히 인식합니다.
    let safeStr = String(dateStr).replace(' ', 'T'); 
    return new Date(safeStr);
}
        
        // ❌ [삭제] 아래 줄을 지우세요! (이제 맨 위의 주소를 자동으로 씁니다)
        // const GOOGLE_SHEET_URL = "..."; 

        // 자동으로 맨 위에 적은 GOOGLE_SHEET_URL을 가져옵니다.
        const response = await fetch(GOOGLE_SHEET_URL); 
        const data = await response.json();
		
		if (data.systemMails) {
            systemMails = data.systemMails.map(row => ({
                id: row.id,
                target: row.target, // 'ALL' or UID
                title: row.title,
                content: row.content,
                rewards: row.rewards ? JSON.parse(row.rewards) : {}, // JSON 파싱
                startDate: parseDate(row.startDate),
        endDate: parseDate(row.endDate)
            }));
            console.log("시스템 우편 데이터 로드 완료:", systemMails.length);
        }

        // 1. 캐릭터 데이터 조립
        chibiImages = {}; 
const rawCharacterData = data.characters || data.Characters || []; 

if (!rawCharacterData || rawCharacterData.length === 0) {
    console.error("❌ 캐릭터 데이터를 찾을 수 없습니다. (시트 이름 확인 필요)");
}
        characters = data.characters.map(row => {
            // [수정] baseName 처리: 시트에 값이 없으면 이름에서 [ ]를 떼고 생성
            let rawBase = row.baseName || row.basename || row['baseName ']; 

            if (!rawBase || String(rawBase).trim() === "") {
                rawBase = row.name.replace(/\[.*?\]\s*/g, '');
            }

            const calculatedBaseName = String(rawBase).trim();

            // [수정] 치비 이미지 전역 변수에 저장 (이게 없어서 이미지가 안 떴음)
            if (row.chibi_image || row.cardImageUrl || row.imageUrl) {
                 chibiImages[row.name] = row.chibi_image || row.cardImageUrl || row.imageUrl;
            }

            return {
                name: row.name,
                baseName: calculatedBaseName,
                faction: row.faction,
                grade: row.grade, // 혹은 row.rarity
                rarity: row.rarity,
                publishTarget: row.publish_target,
                
                stats: { 
                    hp: Number(row.hp) || 100, 
                    atk: Number(row.atk) || 10, 
                    def: Number(row.def) || 5
                },
                
                imageUrl: row.imageUrl,
                cardImageUrl: row.cardImageUrl || row.imageUrl,
                chibi_image: row.chibi_image || row.cardImageUrl, // 객체 내부에도 저장
                
                dialogues: row.dialogues ? String(row.dialogues).split('|') : ['...'],
                
                skills: [
    // [0] 첫 번째 스킬
    {
        name: row.skill1_name,
        desc: row.skill1_desc,
        dialogue: row.skill1_dialogue,
        // ✨ value를 power로 변경
        power: parseFloat(row.skill1_power) || 1.0, 
        type: row.skill1_type || 'damage',
        cooldown: 3
    },
    // [1] 두 번째 스킬
    {
        name: row.skill2_name,
        desc: row.skill2_desc,
        dialogue: row.skill2_dialogue,
        // ✨ value를 power로 변경
        power: parseFloat(row.skill2_power) || 0.0, 
        type: row.skill2_type
    }
].filter(skill => skill.name),
                deathDialogue: row.deathDialogue,
                story: row.story,
                enhancementSuccessDialogue: row.enhancementSuccessDialogue
            };
        });

        // 2. 몬스터 데이터 조립
        if (data.monsters) {
    monsters = {}; 
    data.monsters.forEach(row => {
        const mKey = row.key || row.name;
        monsters[mKey] = {
            name: row.name,
            stats: { hp: Number(row.hp), atk: Number(row.atk), def: Number(row.def) },
            imageUrl: row.imageUrl,
            // ▼▼▼ [추가] 광역 공격 여부 체크 ▼▼▼
            isAoE: (row.isAoE === true || row.isAoE === 'TRUE' || row.isAoE === 1)
        };
    });
}

        // 3. 가구 데이터 조립
        if (data.furniture) {
            furnitureItems = data.furniture.map(row => ({
                id: row.id,
                name: row.name,
                type: row.type,
                size: { w: Number(row.w), h: Number(row.h) }, 
                cost: Number(row.cost),
                scale: row.scale ? Number(row.scale) : undefined, 
                imageUrl: row.imageUrl
            }));
        }

        // 4. 이벤트 던전 조립
        if (data.eventDungeons) {
    eventDungeons = data.eventDungeons.map(row => ({
        eventId: row.eventId || 'ALL', // ✨ eventId 추가 (없으면 ALL)
        name: row.name,
        monsterName: row.monsterName,
        eventPointReward: Number(row.eventPointReward)
    }));
}

        // 5. 이벤트 상점 조립
        if (data.eventShop) {
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
                    itemData: itemData,
					eventId: row.eventId || 'ALL'
                };
            });
        }

        // 6. 메인 스토리 조립
        if (data.mainStories) {
            const rawMainStories = data.mainStories;
            mainStories = [];
            let currentMainChapter = null;
            let currentMainChapterId = -1;

            rawMainStories.forEach(row => {
                const chapterId = Number(row.chapter_id);
                if (chapterId !== currentMainChapterId) {
                    currentMainChapterId = chapterId;
                    currentMainChapter = {
    id: chapterId, // ✨ 이 줄을 추가해서 0장인지 1장인지 구분할 수 있게 합니다.
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
        }

        // 7. 이벤트 스토리 조립
        if (data.eventStories) {
    const rawEventStories = data.eventStories;
    eventStories = [];
    let currentEventChapter = null;
    
    // 이전 행의 키를 기억하기 위한 변수
    let lastKey = ""; 

    rawEventStories.forEach(row => {
        const eventId = row.eventId || "unknown"; // ✨ 시트의 eventId 컬럼 읽기
        const chapterId = Number(row.chapter_id);
        
        // ✨ [핵심] 이벤트ID와 챕터ID가 모두 같아야 같은 스토리로 인식
        const uniqueKey = `${eventId}_${chapterId}`;

        if (uniqueKey !== lastKey) {
            lastKey = uniqueKey;
            
            currentEventChapter = {
                eventId: eventId, // ✨ 여기에 ID 저장 (제목은 저장 안 함)
                chapterId: chapterId,
                title: row.title,
                content: []
            };
            eventStories.push(currentEventChapter);
        }
        
        // 대사 내용 추가
        currentEventChapter.content.push({
            character: (row.character && row.character !== "") ? row.character : null,
            expression: row.expression,
            position: row.position,
            dialogue: row.dialogue
        });
    });
}

        // 8. 이벤트 정보 설정 (디버깅 로그 추가 버전)
        if (data.eventInfo && data.eventInfo.length > 0) {
    allEventInfos = data.eventInfo.map(info => ({
        id: info.id || `event_${info.title}`,
        title: info.title,
        startDate: parseDate(info.startDate),
        endDate: parseDate(info.endDate)
    }));

    // ✨ [수정] 내 PC 시간이 아니라, 무조건 '한국 시간(KST)' 객체를 생성합니다.
    const nowKST = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    console.log("🕒 [시스템 시간(KST)]:", nowKST.toLocaleString());
    
    // 시트에 있는 이벤트 목록 중 '한국 시간 기준'으로 진행 중인 이벤트 찾기
    const activeEvent = data.eventInfo.find(info => {
        const start = parseDate(info.startDate);
        const end = parseDate(info.endDate);
        
        // KST 기준으로 비교
        const isOpen = nowKST >= start && nowKST <= end;

        // 디버깅용 로그
        console.log(`🔍 [이벤트 체크] ${info.title}`);
        console.log(`   - 기간: ${start.toLocaleString()} ~ ${end.toLocaleString()}`);
        console.log(`   👉 결과: ${isOpen ? "✅ 진행중" : "❌ 기간 아님"}`);

        return isOpen;
    });

    if (activeEvent) {
        // ID 생성 로직 (기존 유지)
        const safeId = activeEvent.id || `event_${activeEvent.title}`; 

        console.log(`🎉 현재 활성화된 이벤트: ${activeEvent.title} (ID: ${safeId})`);
        
        // 전역 변수 업데이트
        CURRENT_EVENT_ID = safeId; 
        EVENT_CHARACTER_NAME = activeEvent.gachaCharacterName;

        currentEventInfo = {
            id: safeId,
            title: activeEvent.title,
            startDate: new Date(activeEvent.startDate),
            endDate: new Date(activeEvent.endDate),
            bannerImageUrl: activeEvent.bannerImageUrl,
            description: activeEvent.description,
            gachaCharacterName: activeEvent.gachaCharacterName
        };
    } else {
        console.log("⚠️ 현재(KST 기준) 진행 중인 이벤트가 없습니다.");
        CURRENT_EVENT_ID = null;
        currentEventInfo = null;
    }
}

        // 10. 가챠 등장 목록(Pool) 설정
        if (data.gachaPool) {
    gachaPool = {};
    data.gachaPool.forEach(row => {
        gachaPool[row.name] = {
            // 일반 서가 등장 여부 (기존 유지)
            normal: (row.in_normal === true || row.in_normal === 'TRUE' || row.in_normal === 1),
            
            // ✨ [핵심 수정] 단순 TRUE/FALSE가 아니라 '이벤트 ID'를 저장합니다.
            // 시트 컬럼명이 target_event_id 라고 가정합니다. (시트 헤더와 일치시켜주세요)
            // 만약 해당 이벤트 때만 등장하게 하려면 여기에 'event_title' 등을 적습니다.
            targetEventId: row.target_event_id || row.eventId || null 
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
                // 빈 스테이지 제거
                chapterObj.stages = chapterObj.stages.filter(s => s !== undefined);
                mainChapters.push(chapterObj);
            });
            // 전역 변수 stages에도 할당
            stages = mainChapters; 
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
		// ✨ [추가] 2.5 레이드 보스 데이터 로드
if (data.raidBoss && data.raidBoss.length > 0) {
    // 레이드 보스는 하나만 사용한다고 가정하고 첫 번째 행만 가져옵니다.
    const bossRow = data.raidBoss[0]; 
    raidBossDataSheet = {
        name: bossRow.name,
        level: Number(bossRow.level) || 1,
        maxHp: Number(bossRow.maxHp) || 1000000,
        atk: Number(bossRow.atk) || 100,
        def: Number(bossRow.def) || 50,
        imageUrl: bossRow.imageUrl,
        isAoE: (bossRow.isAoE === true || bossRow.isAoE === 'TRUE' || bossRow.isAoE === 1)
    };
    console.log("레이드 보스 시트 데이터 로드 완료:", raidBossDataSheet.name);
}

        // 13. 인연(Synergy) 데이터 조립
        if (data.synergies) {
            synergies = data.synergies.map(row => {
                return {
                    name: row.name,
                    description: row.description,
                    
                    condition: (deck) => {
                        if (row.type === 'faction') {
                            const hasReq1 = deck.some(c => c.faction === row.req1);
                            const hasReq2 = deck.some(c => c.faction === row.req2);
                            return hasReq1 && hasReq2;
                        } else if (row.type === 'character') {
                            const hasReq1 = deck.some(c => c.baseName === row.req1);
                            const hasReq2 = deck.some(c => c.baseName === row.req2);
                            return hasReq1 && hasReq2;
                        }
                        return false;
                    },

                    applyBonus: (card) => {
                        let isTarget = false;
                        if (row.target === 'all') {
                            isTarget = true;
                        } else if (row.target === 'self') {
                            if (row.type === 'character') {
                                isTarget = (card.baseName === row.req1 || card.baseName === row.req2);
                            } else if (row.type === 'faction') {
                                isTarget = (card.faction === row.req1 || card.faction === row.req2);
                            }
                        }

                        if (isTarget) {
                            const val = Number(row.value);
                            const statKey = row.stat;     

                            if (row.method === 'multiply') {
                                card.stats[statKey] = Math.floor(card.stats[statKey] * val);
                            } else if (row.method === 'add') {
                                card.stats[statKey] += val;
                            }
                        }
                    }
                };
            });
            console.log("인연 데이터 로드 완료:", synergies.length);
        } else {
            synergies = [];
        }

        // 14. 마이룸 상호작용 대사 조립 (수정됨: Map 구조 유지)
        if (data.interactions) {
            const tempMap = {}; 

            data.interactions.forEach(row => {
                const c1 = String(row.char1).trim();
                const c2 = String(row.char2).trim();
                const pairKey = [c1, c2].sort().join('_');
                
                if (!tempMap[pairKey]) {
                    tempMap[pairKey] = {
                        pair: [c1, c2], 
                        dialogues: []
                    };
                }
                tempMap[pairKey].dialogues.push([row.dialogue1, row.dialogue2]);
            });

            // [핵심] 배열로 변환 안 함! tempMap 그대로 사용
            interactionDialogues = tempMap; 
            console.log("상호작용 대사 로드 완료 (Map 구조 유지됨)");
        }
		
		
        
        console.log("모든 데이터 로딩 완료!");
        
        // 게임 초기화 함수 호출
        if (typeof initGame === "function") {
            initGame();
        }

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
    { id: 'ach_001', title: '첫걸음', description: '누군가의 서고에서 1회 뽑기', condition: (state) => state.stats.totalPulls >= 1, reward: { currency: 100 } },
    { id: 'ach_002', title: '수집의 시작', description: '누군가의 서고에서 10회 뽑기', condition: (state) => state.stats.totalPulls >= 10, reward: { currency: 500 } },
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



// yumecan_data.js 파일 맨 끝부분에 추가하세요.

// 범용 상호작용 대사 (쌍이 맞지 않을 때 사용하는 기본 대사)
const genericInteractions = [
    ['오늘 날씨가 좋네요.', '그러게 말입니다.'],
    ['사건 조사는 잘 돼가나요?', '쉽지 않네요.'],
    ['안녕하세요!', '반갑습니다.'],
    ['잠시 쉬었다 갈까요?', '좋은 생각입니다.']
];



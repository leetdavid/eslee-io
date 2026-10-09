import type { TypeLore } from "@/lore/schema";

export const SJ_LORE: Record<"ISTJ" | "ISFJ" | "ESTJ" | "ESFJ", TypeLore> = {
  ISTJ: {
    nickname: {
      ko: "칼각 원칙주의자",
      en: "Ruler-straight stickler (칼각): rules, routine, and reliability",
    },
    summary: [
      {
        ko: "약속은 10분 전 도착, 규칙은 무조건 지킴",
        en: "Arrives ten minutes early and follows the rules no matter what.",
      },
      {
        ko: "말수 적고 무뚝뚝하지만 맡은 일은 끝까지 책임짐",
        en: "Quiet and blunt but sees every responsibility through to the end.",
      },
    ],
    topics: {
      social: [
        {
          ko: "아는 사람 몇 명이랑 익숙한 장소가 최고",
          en: "Prefers a few familiar people in a familiar place.",
        },
      ],
      texting: [
        {
          ko: "짧고 정확하게. 'ㅇㅇ', '그래. 5시에 보자.'",
          en: "Short and precise: 'ㅇㅇ' (yeah) or 'OK. See you at 5.'",
        },
      ],
      dating: [
        {
          ko: "표현은 없지만 약속은 철저. 행동으로 보여줌",
          en: "Rarely says it but keeps every promise and shows love through actions.",
        },
      ],
      conflict: [
        {
          ko: "규칙 어긴 쪽이 잘못. 사실관계로 따짐",
          en: "Whoever broke the rule is wrong; argues strictly from the facts.",
        },
      ],
      planning: [
        {
          ko: "엑셀로 일정 관리. 갑자기 바뀌면 스트레스",
          en: "Manages their schedule in a spreadsheet and gets stressed by sudden changes.",
        },
        {
          ko: "약속 시간 칼같이. 지각하는 사람 이해 못 함",
          en: "Punctual to the minute and can't understand people who are late.",
        },
      ],
      work: [
        {
          ko: "매뉴얼대로 꼼꼼하게. 실수 없는 성실함의 대명사",
          en: "Works carefully by the manual; the definition of error-free diligence.",
        },
      ],
      money: [
        {
          ko: "가계부 쓰고 고정 지출 관리. 충동구매 없음",
          en: "Keeps a household ledger, tracks fixed expenses, and never buys on impulse.",
        },
      ],
      emotions: [
        {
          ko: "감정 표현 거의 없음. 결말 납득되면 살짝 찡",
          en: "Rarely shows emotion; a satisfying ending earns one quiet sniffle.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받아도 루틴 지키며 혼자 해결",
          en: "Copes with stress alone by sticking to their routine.",
        },
      ],
      food: [
        {
          ko: "먹던 것만 먹음. 단골집 메뉴 고정",
          en: "Eats the same things and always orders the usual at regular spots.",
        },
      ],
      travel: [
        {
          ko: "교통편, 숙소, 맛집 다 예약 완료 후 출발",
          en: "Leaves only after transport, lodging, and restaurants are all booked.",
        },
      ],
      hobbies: [
        {
          ko: "정해진 루틴대로 운동, 독서, 정리정돈",
          en: "Works out, reads, and tidies up on a fixed routine.",
        },
      ],
      humor: [
        {
          ko: "진지한 표정으로 던지는 아재개그",
          en: "Delivers dad jokes (아재개그) with a completely straight face.",
        },
      ],
      friendship: [
        {
          ko: "오래된 친구 몇 명. 한번 친구면 끝까지 의리",
          en: "Keeps a few long-time friends and stays loyal for life.",
        },
      ],
      media: [
        {
          ko: "슬픈 장면에서 잘 안 움. 고증 오류가 더 신경 쓰임",
          en: "Rarely cries at sad scenes and is more bothered by historical inaccuracies.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 매뉴얼대로 침착하게. 비상물품 이미 구비",
          en: "Survives a zombie outbreak calmly by the manual, with an emergency kit already prepared.",
        },
      ],
      drinking: [
        {
          ko: "회식은 의무라 참석, 정해진 시간에 칼같이 귀가",
          en: "Attends 회식 as a duty and leaves exactly at the set time.",
        },
      ],
    },
  },
  ISFJ: {
    nickname: {
      ko: "조용한 수호천사",
      en: "Quiet guardian angel (수호천사): remembers everything and takes care of everyone",
    },
    summary: [
      {
        ko: "남 챙기는 게 습관. 거절 못 해서 혼자 끙끙",
        en: "Takes care of others by habit and suffers quietly because they can't say no.",
      },
      {
        ko: "작은 것도 다 기억하는 배려왕. 서운한 것도 다 기억함",
        en: "A considerate soul who remembers every small detail, including every hurt.",
      },
    ],
    topics: {
      social: [
        {
          ko: "친한 사람들과 조용한 모임 선호. 분위기 맞춰줌",
          en: "Prefers quiet get-togethers with close friends and adapts to the mood.",
        },
      ],
      texting: [
        {
          ko: "'넵 알겠습니다~!' 예의 바른 답장. 말투 한 번 더 다듬음",
          en: "Sends polite replies like 'Yes, got it~!' and edits the tone once more before sending.",
        },
      ],
      dating: [
        {
          ko: "티 안 나게 챙김. 상대 취향 다 기억함",
          en: "Quietly takes care of a partner and remembers every preference.",
        },
      ],
      conflict: [
        {
          ko: "갈등 싫어서 참음. 쌓이다 터지면 무서움",
          en: "Avoids conflict and holds it in; scary when it finally bursts.",
        },
      ],
      planning: [
        {
          ko: "미리미리 준비. 약속 전날 준비물 체크",
          en: "Prepares well ahead and checks what to bring the night before.",
        },
      ],
      work: [
        {
          ko: "묵묵히 일 다 하는데 공은 남이 가져감",
          en: "Silently does all the work while someone else takes the credit.",
        },
      ],
      money: [
        {
          ko: "알뜰하게 저축. 대신 가족과 친구 선물엔 후함",
          en: "Saves frugally but is generous with gifts for family and friends.",
        },
      ],
      emotions: [
        {
          ko: "티는 안 내지만 휴지는 제일 먼저 꺼냄",
          en: "Doesn't show it, but is the first to pull out the tissues.",
        },
        {
          ko: "남 앞에선 참다가 혼자 몰래 우는 타입",
          en: "Holds back in front of others and cries secretly alone.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받아도 괜찮은 척. 혼자 삭힘",
          en: "Pretends to be fine under stress and keeps it inside.",
        },
      ],
      food: [
        {
          ko: "남 먹고 싶은 거 먼저 물어봄. 익숙한 맛 선호",
          en: "Asks what others want first and prefers familiar flavors.",
        },
      ],
      travel: [
        {
          ko: "준비물 꼼꼼히 챙겨서 일행 상비약까지 담당",
          en: "Packs carefully and carries the whole group's first-aid supplies.",
        },
      ],
      hobbies: [
        {
          ko: "집에서 요리, 베이킹, 드라마 정주행",
          en: "Cooks, bakes, and binge-watches dramas at home.",
        },
      ],
      humor: [
        { ko: "친한 사람 앞에선 의외로 웃긴 드립", en: "Surprisingly funny around close friends." },
      ],
      friendship: [
        {
          ko: "친구 생일, 취향 다 기억하는 챙김 담당",
          en: "Remembers every friend's birthday and taste and looks after everyone.",
        },
      ],
      media: [
        {
          ko: "슬픈 장면에서 소리 없이 눈물. 가족 얘기에 특히 약함",
          en: "Cries silently at sad scenes and is especially weak to family stories.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태에 다친 사람 치료하고 식량 관리 담당",
          en: "In a zombie outbreak, treats the wounded and manages the food supply.",
        },
      ],
      drinking: [
        {
          ko: "회식에서 수저 놓고 고기 굽는 담당. 2차는 눈치 보다 감",
          en: "Sets out the utensils and grills the meat at 회식; joins 2차 if others seem to expect it.",
        },
      ],
    },
  },
  ESTJ: {
    nickname: {
      ko: "엑셀 장인 관리자",
      en: "Spreadsheet boss (엑셀 장인): the organizer who runs everything",
    },
    summary: [
      {
        ko: "모임 일정 잡고 총무 맡고 계산까지 하는 리더",
        en: "Schedules the meetup, handles the money, and settles the bill.",
      },
      {
        ko: "효율과 규칙이 생명. 비효율 보면 잔소리 시작",
        en: "Lives by efficiency and rules and starts nagging at any waste.",
      },
    ],
    topics: {
      social: [
        {
          ko: "모임 총무 담당. 사람 많은 자리도 잘 이끎",
          en: "Acts as the group's treasurer (총무) and leads big gatherings well.",
        },
      ],
      texting: [
        {
          ko: "칼답이지만 용건만. '정리하면 이거야'",
          en: "Replies instantly but only on business: 'To sum it up, here's the plan.'",
        },
      ],
      dating: [
        {
          ko: "연애도 계획적. 데이트 코스 미리 다 짬",
          en: "Approaches dating with plans and maps out every date in advance.",
        },
      ],
      conflict: [
        {
          ko: "잘잘못 확실히 따짐. 직설적으로 말함",
          en: "Settles exactly who is right and wrong and says it bluntly.",
        },
      ],
      planning: [
        {
          ko: "'회의 시간 1분 지났는데 왜 시작 안 함?'",
          en: "'It's one minute past the meeting time—why haven't we started?'",
        },
        {
          ko: "여행 일정 엑셀로 분 단위 정리",
          en: "Organizes trip itineraries in a spreadsheet down to the minute.",
        },
      ],
      work: [
        {
          ko: "업무 분배와 마감 관리 장인. 일 못하면 직접 함",
          en: "A master of dividing work and managing deadlines who takes over when others fail.",
        },
      ],
      money: [
        {
          ko: "더치페이 원 단위까지 정확하게. 재테크도 체계적",
          en: "Splits bills (더치페이) down to the last won and manages investments systematically.",
        },
      ],
      emotions: [
        {
          ko: "울 시간에 해결책 찾음. 남은 러닝타임 확인",
          en: "Looks for solutions instead of crying and checks how much runtime is left.",
        },
      ],
      stress: [
        {
          ko: "스트레스는 할 일 목록 지우면서 해소",
          en: "Relieves stress by crossing items off a to-do list.",
        },
      ],
      food: [
        {
          ko: "맛집 미리 예약. 메뉴도 효율적으로 결정",
          en: "Books restaurants in advance and decides menus efficiently.",
        },
      ],
      travel: [
        {
          ko: "단체 여행 총괄. 시간표대로 안 움직이면 화남",
          en: "Runs group trips and gets angry when people don't follow the timetable.",
        },
      ],
      hobbies: [
        {
          ko: "운동, 재테크 공부, 집 정리. 생산적인 휴식",
          en: "Rests productively: working out, studying investments, organizing the house.",
        },
      ],
      humor: [
        {
          ko: "의도치 않은 팩폭이 웃음 포인트",
          en: "Gets laughs from unintentional blunt truths (팩폭).",
        },
      ],
      friendship: [
        {
          ko: "친구 모임 꾸준히 소집. 연락 끊기면 먼저 챙김",
          en: "Keeps calling the friend group together and reaches out when someone goes quiet.",
        },
      ],
      media: [
        {
          ko: "영화 보다가 개연성 없으면 바로 지적",
          en: "Points out plot holes the moment they appear in a movie.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 규칙 만들고 당번표 짜서 생존 관리",
          en: "In a zombie outbreak, sets rules and makes a duty roster to run the survivors' camp.",
        },
      ],
      drinking: [
        {
          ko: "회식 자리 세팅부터 2차 장소 예약까지 주도",
          en: "Arranges the 회식 seating and books the venue for the second round (2차).",
        },
      ],
    },
  },
  ESFJ: {
    nickname: {
      ko: "오지랖 인싸",
      en: "Group-chat mom (오지랖 인싸): warm, social, and in everyone's business",
    },
    summary: [
      {
        ko: "모두를 챙기는 다정함. 오지랖도 넓음",
        en: "Kindly looks after everyone, with a wide reach of well-meant meddling (오지랖).",
      },
      {
        ko: "어색한 분위기 못 참음. 단톡방 분위기 메이커",
        en: "Can't stand an awkward silence and keeps the group chat lively.",
      },
    ],
    topics: {
      social: [
        {
          ko: "모임 성사 1등. 처음 온 사람도 바로 챙김",
          en: "Makes every gathering happen and welcomes newcomers right away.",
        },
      ],
      texting: [
        {
          ko: "1분 컷 칼답. 늦으면 상대가 서운할까 봐 걱정",
          en: "Replies within a minute (칼답) and worries that a late reply will hurt feelings.",
        },
        {
          ko: "'괜찮았어요? 😊' 이모티콘 적극 사용",
          en: "Uses emoji generously, like 'Was it okay? 😊'",
        },
      ],
      dating: [
        {
          ko: "기념일 다 챙기고 상대 가족까지 신경 씀",
          en: "Celebrates every anniversary and even looks after the partner's family.",
        },
      ],
      conflict: [
        {
          ko: "서운함은 바로 표현, 화해도 빨리",
          en: "Says right away when they feel hurt and makes up quickly.",
        },
      ],
      planning: [
        {
          ko: "모임 날짜 투표 올리고 장소까지 정함",
          en: "Posts the date poll for meetups and picks the venue.",
        },
      ],
      work: [
        {
          ko: "팀 분위기 챙기며 협업 잘함. 인정받고 싶어함",
          en: "Keeps team spirits up, collaborates well, and wants recognition.",
        },
      ],
      money: [
        {
          ko: "선물, 경조사엔 돈 아끼지 않음",
          en: "Never skimps on gifts or family celebrations.",
        },
      ],
      emotions: [
        {
          ko: "가족 얘기에 약함. 옆 사람 휴지까지 챙겨줌",
          en: "Weak to family stories and hands tissues to the person beside them.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 친구한테 털어놓고 위로받음",
          en: "Vents to friends and seeks comfort when stressed.",
        },
      ],
      food: [
        {
          ko: "모두 입맛 맞춰 메뉴 정하고 앞접시 나눠줌",
          en: "Picks a menu for everyone and hands out the shared plates.",
        },
      ],
      travel: [
        {
          ko: "단체 사진 담당. 다 같이 즐거워야 만족",
          en: "Takes the group photos and is happy only if everyone is having fun.",
        },
      ],
      hobbies: [
        {
          ko: "친구 만나기, 카페 투어, 모임 기획",
          en: "Meets friends, tours cafés, and plans get-togethers.",
        },
      ],
      humor: [
        {
          ko: "리액션 좋고 다 같이 웃는 분위기 만듦",
          en: "Gives great reactions and creates a room where everyone laughs.",
        },
      ],
      friendship: [
        {
          ko: "친구 생일파티 주최, 단톡방 관리자",
          en: "Throws friends' birthday parties and manages the group chat.",
        },
      ],
      media: [
        {
          ko: "가족 드라마 보고 펑펑 울고 바로 단톡방에 후기",
          en: "Sobs at family dramas and posts a review to the group chat right away.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 생존자 밥 챙기고 분위기 수습",
          en: "In a zombie outbreak, feeds the survivors and holds everyone together.",
        },
      ],
      drinking: [
        {
          ko: "회식에서 잔 비면 바로 채워줌. 2차도 OK",
          en: "Refills empty glasses at 회식 and is happy to go on to 2차.",
        },
      ],
    },
  },
};

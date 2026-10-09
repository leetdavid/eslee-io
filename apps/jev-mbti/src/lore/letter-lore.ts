import type { MbtiLetter } from "@/lib/mbti";
import type { LetterLore } from "@/lore/schema";

export const LETTER_LORE: Record<MbtiLetter, LetterLore> = {
  E: {
    general: [
      {
        ko: "사람 만나야 충전되는 대문자 E. 혼자 있으면 시들음",
        en: "Extroverts (big E, 대문자 E) recharge by meeting people and wilt when left alone.",
      },
      {
        ko: "E가 하루만 I로 살면 심심해서 병난다는 밈",
        en: "Meme: if an E lived like an I for a single day, they'd get sick from boredom.",
      },
      {
        ko: "생각보다 말이 먼저. 말하면서 생각 정리",
        en: "E types speak before thinking and sort out their thoughts by talking.",
      },
    ],
    social: [
      {
        ko: "주말 약속 2~3개는 기본, 즉석 번개도 OK",
        en: "E types book two or three weekend hangouts by default and say yes to last-minute meetups (번개).",
      },
      {
        ko: "처음 보는 사람한테도 먼저 말 검",
        en: "E types start conversations with strangers first.",
      },
    ],
    texting: [
      {
        ko: "답장 빠르고 단톡방 지분 높음",
        en: "E types reply fast and own a big share of the group chat.",
      },
    ],
    drinking: [
      {
        ko: "회식 2차, 3차까지 끝까지 남는 쪽",
        en: "E types are the ones who stay through the second and third rounds of 회식.",
      },
    ],
    hobbies: [
      {
        ko: "주말에 집에 있으면 답답해서 일단 나감",
        en: "E types feel cooped up at home on weekends and head out anyway.",
      },
    ],
    stress: [
      {
        ko: "스트레스는 사람 만나서 수다로 풂",
        en: "E types talk their stress away with friends.",
      },
    ],
    travel: [
      {
        ko: "여행 가서 현지인, 다른 여행객이랑 금방 친해짐",
        en: "E types make friends with locals and other travelers quickly.",
      },
    ],
  },
  I: {
    general: [
      {
        ko: "혼자 있어야 충전되는 I. 사람 만나면 기 빨림",
        en: "Introverts (I) recharge alone and get drained (기 빨림) by people.",
      },
      {
        ko: "약속 취소되면 속으로 환호하는 집콕러",
        en: "I types secretly cheer when plans get canceled and love staying home (집콕).",
      },
      {
        ko: "생각 정리가 다 끝나야 말함",
        en: "I types speak only after fully thinking things through.",
      },
    ],
    social: [
      {
        ko: "모임 끝나면 집 가서 최소 하루는 충전",
        en: "I types need at least a day at home to recharge after a gathering.",
      },
    ],
    texting: [
      {
        ko: "전화보다 카톡, 카톡보다 읽고 나중에 답장",
        en: "I types prefer texting over calls, and reading now and replying later over both.",
      },
    ],
    drinking: [
      {
        ko: "회식은 1차까지. 몰래 빠져나가는 기술 보유",
        en: "I types stay for the first round only and have mastered slipping out unnoticed.",
      },
    ],
    hobbies: [
      {
        ko: "주말엔 침대, 넷플릭스, 배달음식이 완벽한 조합",
        en: "For I types, bed, Netflix, and delivery food make the perfect weekend.",
      },
    ],
    stress: [
      {
        ko: "스트레스 받으면 연락 끊고 혼자 동굴로",
        en: "I types cut off contact and retreat into their cave under stress.",
      },
    ],
    work: [
      {
        ko: "발표보다 자료 조사가 편함",
        en: "I types would rather do the research than present it.",
      },
    ],
  },
  S: {
    general: [
      {
        ko: "현실파 S. 지금 눈앞의 사실과 경험이 중요",
        en: "Sensing (S) types are realists who care about the facts and experience in front of them.",
      },
      {
        ko: "'만약에' 질문에 '그럴 일 없는데?'라고 답함",
        en: "S types answer 'what if' questions with 'That would never happen.'",
      },
    ],
    humor: [
      {
        ko: "상황 개그, 몸개그처럼 바로 웃긴 걸 좋아함",
        en: "S types prefer immediate humor like situational and physical comedy.",
      },
    ],
    media: [
      {
        ko: "개연성, 고증 오류를 잘 잡아냄",
        en: "S types quickly catch plot holes and factual errors.",
      },
    ],
    crisis: [
      {
        ko: "위기엔 현실적으로 당장 필요한 것부터 챙김",
        en: "In a crisis, S types grab whatever is practically needed right now.",
      },
    ],
    work: [
      {
        ko: "구체적인 지시와 매뉴얼을 선호",
        en: "S types prefer concrete instructions and manuals.",
      },
    ],
    hobbies: [
      {
        ko: "직접 만들고 체험하는 취미 선호",
        en: "S types prefer hands-on hobbies they can make and experience.",
      },
    ],
    food: [{ ko: "검증된 맛, 아는 맛을 선호", en: "S types prefer proven, familiar flavors." }],
  },
  N: {
    general: [
      {
        ko: "상상력 풍부한 N. 머릿속에서 영화 한 편 찍음",
        en: "Intuitive (N) types have rich imaginations and shoot a whole movie in their heads.",
      },
      {
        ko: "'만약 좀비가 나타나면?' 같은 질문을 진지하게 고민",
        en: "N types seriously ponder questions like 'What if zombies appeared?'",
      },
    ],
    humor: [
      { ko: "아무도 이해 못 하는 4차원 드립", en: "N types make offbeat jokes nobody else gets." },
    ],
    media: [
      {
        ko: "세계관, 떡밥 분석에 과몰입",
        en: "N types get absorbed in analyzing a story's world and hidden clues (떡밥).",
      },
    ],
    crisis: [
      {
        ko: "위기 상황을 이미 머릿속으로 백 번 시뮬레이션함",
        en: "N types have already simulated the disaster a hundred times in their heads.",
      },
    ],
    dating: [
      {
        ko: "썸 단계에서 결혼 후 노후까지 상상",
        en: "N types imagine everything up to retirement together while still just flirting (썸).",
      },
    ],
    hobbies: [
      {
        ko: "망상, 글쓰기, 세계관 만들기",
        en: "N types enjoy daydreaming, writing, and building fictional worlds.",
      },
    ],
    work: [
      {
        ko: "큰 그림은 좋아하는데 디테일 놓침",
        en: "N types love the big picture but miss details.",
      },
    ],
  },
  T: {
    general: [
      {
        ko: "'너 T야?' 공감보다 해결책이 먼저 나오는 사고형",
        en: "Thinking (T) types offer solutions before empathy, earning the jab 'Are you a T?' (너 T야?).",
      },
      {
        ko: "'나 우울해서 빵 샀어' 하면 '무슨 빵?'이라고 묻는 쪽",
        en: "When a friend says 'I bought bread because I felt down,' a T asks 'What kind of bread?'",
      },
      {
        ko: "팩폭러. 본인은 도와주려고 한 말",
        en: "T types deliver hard truths (팩폭) while genuinely trying to help.",
      },
    ],
    emotions: [
      {
        ko: "슬픈 장면보다 개연성에 집중. 잘 안 움",
        en: "T types focus on plot logic over sad scenes and rarely cry.",
      },
      {
        ko: "T의 애정은 질문, F의 애정은 리액션",
        en: "Meme: a T shows care with questions, an F with reactions.",
      },
    ],
    conflict: [
      {
        ko: "싸울 때 '그래서 요점이 뭔데?' 논리로 따짐",
        en: "T types argue by logic: 'So what's your point?'",
      },
    ],
    dating: [
      {
        ko: "연인이 힘들다 하면 해결책 리스트를 줌",
        en: "When a partner is struggling, a T hands over a list of solutions.",
      },
    ],
    friendship: [
      {
        ko: "고민 상담엔 현실적인 조언, 위로는 서툼",
        en: "T types give troubled friends realistic advice but struggle to comfort them.",
      },
    ],
    texting: [
      {
        ko: "용건 위주 답장. 'ㅇㅇ'에 다른 뜻 없음",
        en: "T types reply on business only, and a bare 'ㅇㅇ' (yeah) carries no hidden feelings.",
      },
    ],
    media: [
      {
        ko: "감동 장면에서 '저게 말이 돼?'",
        en: "At a moving scene, a T asks 'Does that even make sense?'",
      },
    ],
  },
  F: {
    general: [
      {
        ko: "공감이 먼저인 감정형 F. '우울해서 빵 샀어'엔 '왜 우울해?'",
        en: "Feeling (F) types lead with empathy: to 'I bought bread because I felt down,' they ask 'Why are you down?'",
      },
      {
        ko: "작은 말투 변화에도 의미 부여. 'ㅋㅋ' 줄면 서운함",
        en: "F types read meaning into small tone changes and feel hurt when the ㅋㅋ (laughter) gets shorter.",
      },
      {
        ko: "공감 못 하는 친구한테 'T발 C야?'라고 장난침",
        en: "F types tease unempathetic friends with the pun 'T발 C야?'",
      },
    ],
    emotions: [
      {
        ko: "영화 보다가 먼저 울고, 남이 울면 따라 움",
        en: "F types cry first at movies and cry along when others do.",
      },
      {
        ko: "남 고민 들으면 내 일처럼 같이 아파함",
        en: "F types feel a friend's worries as if they were their own.",
      },
    ],
    conflict: [
      {
        ko: "싸울 때 논리보다 '말투가 서운해'",
        en: "In fights, F types care less about logic than 'your tone hurt me.'",
      },
    ],
    dating: [
      {
        ko: "연인의 기분 변화를 바로 캐치하고 표현도 풍부",
        en: "F types notice a partner's mood shifts instantly and express love richly.",
      },
    ],
    friendship: [
      {
        ko: "친구 고민엔 해결책보다 위로와 공감",
        en: "F types offer friends comfort and empathy instead of solutions.",
      },
    ],
    texting: [
      {
        ko: "이모티콘, 'ㅠㅠ'로 감정 표현 풍부",
        en: "F types express feelings richly with emoji and ㅠㅠ (crying).",
      },
    ],
    media: [
      {
        ko: "주인공에 과몰입해서 며칠 여운",
        en: "F types over-identify with the hero and feel it for days afterward.",
      },
    ],
  },
  J: {
    general: [
      {
        ko: "계획 없으면 불안한 J. 파워 J는 엑셀로 인생 관리",
        en: "Judging (J) types feel uneasy without a plan; a 'power J' (파워 J) runs life on spreadsheets.",
      },
      {
        ko: "약속 10분 전 도착, 일정 바뀌면 스트레스",
        en: "J types arrive ten minutes early and get stressed when plans change.",
      },
    ],
    planning: [
      {
        ko: "일정표, 체크리스트, 알람 3중 세팅",
        en: "J types triple-check with schedules, checklists, and alarms.",
      },
      {
        ko: "갑자기 약속이 바뀌면 하루가 무너짐",
        en: "For a J, a sudden change of plans ruins the whole day.",
      },
    ],
    travel: [
      {
        ko: "여행 일정 엑셀로 분 단위. 맛집 예약 완료",
        en: "J types plan trips in a spreadsheet down to the minute, with every restaurant booked.",
      },
    ],
    work: [{ ko: "마감 일주일 전에 끝냄", en: "J types finish a week before the deadline." }],
    money: [
      {
        ko: "가계부와 예산 관리, 충동구매 적음",
        en: "J types keep a budget and household ledger and rarely buy on impulse.",
      },
    ],
    food: [
      {
        ko: "식당 미리 예약, 메뉴도 미리 정함",
        en: "J types book restaurants and decide the menu in advance.",
      },
    ],
    crisis: [
      { ko: "비상 상황 대비 물품 미리 준비", en: "J types stock emergency supplies in advance." },
    ],
  },
  P: {
    general: [
      {
        ko: "즉흥이 생명인 P. 극P는 '계획'이라는 단어부터 피곤",
        en: "Perceiving (P) types live on spontaneity; an extreme P (극P) is tired by the very word 'plan.'",
      },
      {
        ko: "'일단 가서 정하자'가 입버릇",
        en: "P types always say 'Let's just go and decide there.'",
      },
    ],
    planning: [
      {
        ko: "약속 당일에 장소 정함. 지각도 종종",
        en: "P types pick the place on the day of the meetup and are often late.",
      },
      {
        ko: "계획 세워도 기분 따라 바뀜",
        en: "Even when P types make plans, the plans change with their mood.",
      },
    ],
    travel: [
      {
        ko: "숙소만 잡고 나머진 현장에서. J랑 여행 가면 첫날부터 싸움",
        en: "P types book only the lodging and improvise the rest; traveling with a J means fighting on day one.",
      },
    ],
    work: [
      {
        ko: "마감 직전 초인적 집중력으로 벼락치기",
        en: "P types cram with superhuman focus right before the deadline.",
      },
    ],
    money: [
      {
        ko: "기분 따라 충동구매, 월말엔 텅장",
        en: "P types buy on mood and hit an empty account (텅장) by the end of the month.",
      },
    ],
    food: [
      {
        ko: "그날 땡기는 거 먹음. 웨이팅 보고 즉석 변경",
        en: "P types eat whatever they crave that day and switch places on the spot if the line is long.",
      },
    ],
    crisis: [
      {
        ko: "위기엔 즉흥 대처는 잘하지만 준비물은 없음",
        en: "P types improvise well in a crisis but have no supplies prepared.",
      },
    ],
  },
};

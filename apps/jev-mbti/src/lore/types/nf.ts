import type { TypeLore } from "@/lore/schema";

export const NF_LORE: Record<"INFJ" | "INFP" | "ENFJ" | "ENFP", TypeLore> = {
  INFJ: {
    nickname: {
      ko: "인간 관찰자",
      en: "Mystic people-watcher (인간 관찰자): reads everyone, reveals little",
    },
    summary: [
      {
        ko: "조용히 사람 속을 다 꿰뚫어 봄. 정작 본인 속은 미스터리",
        en: "Quietly sees through everyone while staying a mystery themselves.",
      },
      {
        ko: "겉은 다정한데 선 넘으면 한순간에 문 닫음",
        en: "Warm on the surface but shuts people out in an instant once a line is crossed (the door slam).",
      },
    ],
    topics: {
      social: [
        {
          ko: "사람 좋아하지만 만나고 나면 이틀은 충전해야 함",
          en: "Likes people but needs two days alone to recharge after seeing them.",
        },
      ],
      texting: [
        {
          ko: "답장 정리하느라 늦지만 한 번 보내면 정성 장문",
          en: "Replies slowly while organizing their thoughts, then sends a sincere paragraph.",
        },
      ],
      dating: [
        {
          ko: "몇 달 관찰하다 확신 생기면 의외로 돌직구 고백",
          en: "Watches a crush for months, then confesses surprisingly directly once sure.",
        },
      ],
      conflict: [
        {
          ko: "참고 참다 한 번에 손절. 싸우기보다 조용히 거리 둠",
          en: "Holds it in for a long time, then quietly cuts ties (손절) instead of fighting.",
        },
      ],
      planning: [
        {
          ko: "계획 세워야 마음 편함. 내 계획 틀어지면 멘붕",
          en: "Needs a plan to feel at ease and falls apart when that plan gets disrupted.",
        },
      ],
      work: [
        {
          ko: "의미 있는 일엔 완벽주의로 몰입. 번아웃 주의",
          en: "Pours perfectionist effort into meaningful work and is prone to burnout.",
        },
      ],
      money: [
        {
          ko: "나보다 남 선물에 돈 더 씀. 감성템 수집",
          en: "Spends more on gifts for others than on themselves and collects sentimental keepsakes.",
        },
      ],
      emotions: [
        {
          ko: "조용히 깊게 울고 혼자 삭힘",
          en: "Cries quietly and deeply and works through it alone.",
        },
        {
          ko: "남 감정을 스펀지처럼 흡수함",
          en: "Soaks up other people's feelings like a sponge.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 혼자 일기 쓰며 생각 정리",
          en: "Writes in a journal alone to sort out their thoughts when stressed.",
        },
      ],
      food: [
        {
          ko: "분위기 좋은 단골집 선호. 새로운 곳은 미리 검색",
          en: "Prefers cozy regular spots and researches any new place beforehand.",
        },
      ],
      travel: [
        {
          ko: "의미 있는 장소 위주로 계획. 혼자 여행도 좋아함",
          en: "Plans trips around meaningful places and enjoys traveling alone.",
        },
      ],
      hobbies: [
        {
          ko: "독서, 글쓰기, 혼자 카페에서 사색",
          en: "Reads, writes, and sits alone in cafés lost in thought.",
        },
      ],
      humor: [
        {
          ko: "친한 사람 앞에서만 나오는 은근한 4차원 드립",
          en: "Shows a quirky, offbeat sense of humor only around close friends.",
        },
      ],
      friendship: [
        {
          ko: "모두의 고민 상담사. 정작 본인 고민은 말 안 함",
          en: "Everyone's counselor who never shares their own worries.",
        },
      ],
      media: [
        {
          ko: "주인공 서사에 과몰입. 집에 가는 길에 또 생각나서 울컥",
          en: "Over-invests in the hero's story and tears up again on the way home thinking about it.",
        },
      ],
      crisis: [
        {
          ko: "위기 땐 침착하게 사람들 챙기지만 속으론 멘탈 소모",
          en: "Calmly looks after others in a crisis while being drained inside.",
        },
      ],
      drinking: [
        {
          ko: "회식은 1차까지 버티다 조용히 귀가. 깊은 대화엔 남음",
          en: "Endures the first round of 회식 and slips home, unless a deep conversation starts.",
        },
      ],
    },
  },
  INFP: {
    nickname: {
      ko: "망상 장인",
      en: "Daydream master (망상 장인): a soft heart living in their own imagination",
    },
    summary: [
      {
        ko: "상상 속에선 이미 결혼까지 함. 현실은 침대 위",
        en: "Has already gotten married in their imagination; in reality they're still in bed.",
      },
      {
        ko: "여리고 감성적. 작은 일에도 감정이 파도침",
        en: "Soft-hearted and emotional; small things set off big waves of feeling.",
      },
      {
        ko: "'오늘부터 운동한다' 선언 3년째",
        en: "Has been announcing 'I start working out today' for three years.",
      },
    ],
    topics: {
      social: [
        {
          ko: "약속 잡을 땐 신나는데 당일엔 나가기 싫음",
          en: "Excited when making plans but dreads going out on the actual day.",
        },
      ],
      texting: [
        {
          ko: "답장은 머릿속으로만 하고 안 보냄. 썼다 지웠다 반복",
          en: "Writes the reply in their head but never sends it; types and deletes over and over.",
        },
        {
          ko: "결국 늦게 이모티콘 섞인 감성 장문 보냄",
          en: "Eventually sends a late, heartfelt paragraph full of emoji.",
        },
      ],
      dating: [
        {
          ko: "짝사랑하며 혼자 소설 씀. 한번 빠지면 운명론자",
          en: "Writes a whole novel in their head about a crush and believes in fate once they fall.",
        },
      ],
      conflict: [
        {
          ko: "싸울 땐 할 말 못 하고 집에 와서 이불킥",
          en: "Freezes in arguments and kicks the blanket at home over what they should have said (이불킥).",
        },
      ],
      planning: [
        {
          ko: "계획은 세우는데 기분 따라 다 바뀜",
          en: "Makes plans that change completely depending on mood.",
        },
      ],
      work: [
        {
          ko: "마음 내키면 몰입, 아니면 마감 직전 벼락치기",
          en: "Works intensely when inspired; otherwise crams right before the deadline.",
        },
      ],
      money: [
        {
          ko: "예쁜 거 보면 감성 소비. 통장은 늘 텅장",
          en: "Spends on pretty, sentimental things, so their account is always empty (텅장).",
        },
      ],
      emotions: [
        {
          ko: "예고편만 봐도 눈물 고임. 감정 이입 1등",
          en: "Tears up at a movie trailer; the champion of empathy.",
        },
        {
          ko: "남의 슬픔에도 같이 울고 며칠 동안 생각함",
          en: "Cries along with other people's sadness and dwells on it for days.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 방에 틀어박혀 잠수",
          en: "Shuts themselves in their room and goes silent when stressed.",
        },
      ],
      food: [
        {
          ko: "메뉴 못 고름. '아무거나' 해놓고 싫은 건 있음",
          en: "Can't pick a menu, says 'anything,' yet secretly dislikes some options.",
        },
      ],
      travel: [
        {
          ko: "계획 없이 감성 사진 찍으러 떠남. 숙소는 분위기 우선",
          en: "Leaves on a whim to take aesthetic photos and picks lodging for its vibe.",
        },
      ],
      hobbies: [
        {
          ko: "침대에서 음악 듣고, 그림 그리고, 글 쓰기",
          en: "Listens to music, draws, and writes from bed.",
        },
      ],
      humor: [
        {
          ko: "혼자 웃긴 상상하다 갑자기 웃음 터짐",
          en: "Suddenly bursts out laughing at a funny scene playing in their head.",
        },
      ],
      friendship: [
        {
          ko: "친구는 적지만 진심. 서운한 건 쌓아둠",
          en: "Has few friends but loves them sincerely, while quietly storing up hurt feelings.",
        },
      ],
      media: [
        {
          ko: "드라마 주인공에 과몰입해서 며칠 우울",
          en: "Over-identifies with a drama's lead and stays down for days afterward.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 감염된 친구를 못 버려서 위험해짐",
          en: "In a zombie outbreak, puts themselves in danger by refusing to abandon an infected friend.",
        },
      ],
      drinking: [
        {
          ko: "회식은 최대한 피함. 가면 구석에서 리액션만",
          en: "Avoids 회식 whenever possible; if forced to go, just reacts quietly from the corner.",
        },
      ],
    },
  },
  ENFJ: {
    nickname: {
      ko: "인간 비타민",
      en: "Human vitamin (인간 비타민): a warm leader who lifts everyone up",
    },
    summary: [
      {
        ko: "모두를 챙기는 다정한 리더. 분위기 안 좋으면 본인이 수습",
        en: "A caring leader who looks after everyone and repairs the mood when it sours.",
      },
      {
        ko: "남 고민엔 진심인데 본인 감정은 뒷전",
        en: "Takes everyone's problems to heart while pushing their own feelings aside.",
      },
    ],
    topics: {
      social: [
        {
          ko: "모임 주최 담당. 소외된 사람부터 챙김",
          en: "Hosts the gatherings and checks first on whoever is left out.",
        },
      ],
      texting: [
        {
          ko: "모든 메시지에 답장하려 노력. '고마워ㅠㅠ 진짜 최고'",
          en: "Tries to answer every message with warm replies like 'Thank you ㅠㅠ you're the best.'",
        },
      ],
      dating: [
        {
          ko: "연인한테 헌신적. 기념일, 서프라이즈 다 챙김",
          en: "Devoted to a partner and never misses an anniversary or a surprise.",
        },
      ],
      conflict: [
        {
          ko: "갈등 생기면 중재자. 다 같이 잘 지내길 바람",
          en: "Steps in as the mediator and wants everyone to get along.",
        },
      ],
      planning: [
        {
          ko: "모임 일정 조율해서 다 같이 갈 수 있게 계획",
          en: "Coordinates group schedules so that everyone can come.",
        },
      ],
      work: [
        {
          ko: "팀 분위기 살리는 리더. 칭찬과 격려 담당",
          en: "Leads by keeping team morale high with praise and encouragement.",
        },
      ],
      money: [
        {
          ko: "남한테 쓰는 돈 안 아낌. 계산은 내가",
          en: "Doesn't hold back spending on others and often picks up the bill.",
        },
      ],
      emotions: [
        {
          ko: "모든 인물에게 이입. 감동 연설에서 터짐",
          en: "Empathizes with every character and breaks down at the big moving speech.",
        },
      ],
      stress: [
        {
          ko: "남 챙기다 지쳐도 티 안 내다가 한 번에 번아웃",
          en: "Hides the exhaustion of caring for others until burning out all at once.",
        },
      ],
      food: [
        {
          ko: "모두의 입맛 고려해서 메뉴 정함",
          en: "Picks the restaurant that suits everyone's taste.",
        },
      ],
      travel: [
        {
          ko: "단체 여행 총괄. 다들 즐거운지 계속 체크",
          en: "Organizes group trips and keeps checking that everyone is having fun.",
        },
      ],
      hobbies: [
        {
          ko: "사람 만나는 게 취미. 봉사나 스터디도 좋아함",
          en: "Meeting people is the hobby; also enjoys volunteering and study groups.",
        },
      ],
      humor: [
        {
          ko: "남 웃기려고 리액션 크게. 분위기 띄우는 담당",
          en: "Gives big reactions to make others laugh and keeps the mood up.",
        },
      ],
      friendship: [
        {
          ko: "친구 생일 다 기억하고 고민 상담 1순위",
          en: "Remembers every friend's birthday and is the first call for advice.",
        },
      ],
      media: [
        {
          ko: "감동 장면에서 눈물. 끝나고 감상평 나누는 게 필수",
          en: "Cries at moving scenes and must share reflections afterward.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 생존자 다독이며 팀 결속 담당",
          en: "In a zombie outbreak, keeps survivors calm and the group united.",
        },
      ],
      drinking: [
        {
          ko: "회식 분위기 메이커. 막내 챙기고 2차까지 함께",
          en: "Lifts the mood at 회식, looks after the youngest, and stays for the second round (2차).",
        },
      ],
    },
  },
  ENFP: {
    nickname: {
      ko: "댕댕이",
      en: "Puppy (댕댕이): boundless, affectionate golden-retriever energy",
    },
    summary: [
      {
        ko: "처음 본 사람과도 3시간 수다. 친화력 끝판왕",
        en: "Can chat with a stranger for three hours; the ultimate in friendliness.",
      },
      {
        ko: "흥 많고 감정 기복 큼. 웃다가 울다가 바쁨",
        en: "Full of excitement with big mood swings, busy laughing one moment and crying the next.",
      },
    ],
    topics: {
      social: [
        {
          ko: "약속 3개 연달아 잡는 인싸. 혼자 있으면 심심해 죽음",
          en: "Books three hangouts in a row and gets painfully bored alone.",
        },
      ],
      texting: [
        {
          ko: "칼답에 ㅋㅋㅋ와 이모티콘으로 꽉 채움. 톡 폭탄",
          en: "Replies instantly, stuffed with ㅋㅋㅋ (laughter) and emoji, in a flood of messages.",
        },
        {
          ko: "흥미 떨어지면 갑자기 연락 뚝",
          en: "Goes suddenly silent once the excitement fades.",
        },
      ],
      dating: [
        {
          ko: "사랑에 빠지는 속도 0.5초, 표현도 폭발",
          en: "Falls in love in half a second and expresses it explosively.",
        },
      ],
      conflict: [
        {
          ko: "싸워도 금방 풀리고 먼저 화해 시도",
          en: "Gets over fights fast and is the first to make up.",
        },
      ],
      planning: [
        {
          ko: "계획? '일단 가서 정하자!' 즉흥 그 자체",
          en: "Plans? 'Let's just go and decide there!' Spontaneity itself.",
        },
      ],
      work: [
        {
          ko: "아이디어 넘치지만 마무리 전에 다른 일에 꽂힘",
          en: "Overflows with ideas but jumps to a new obsession before finishing.",
        },
      ],
      money: [
        {
          ko: "기분 좋으면 지름. 경험에 돈 아끼지 않음",
          en: "Splurges when happy and never holds back on experiences.",
        },
      ],
      emotions: [
        {
          ko: "웃다가 울다가 엔딩 크레딧까지 우는 감정 롤러코스터",
          en: "An emotional roller coaster who laughs, then cries all the way through the credits.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 친구 불러서 수다로 풂",
          en: "Calls friends over and talks the stress away.",
        },
      ],
      food: [
        {
          ko: "맛집 탐방 좋아함. 신상 디저트부터 도전",
          en: "Loves restaurant hunting (맛집 탐방) and tries the newest desserts first.",
        },
      ],
      travel: [
        {
          ko: "즉흥 여행 1등. 현지인이랑도 금방 친해짐",
          en: "First to go on a spur-of-the-moment trip and befriends locals right away.",
        },
      ],
      hobbies: [
        {
          ko: "취미 부자. 시작한 건 많은데 끝까지 한 건 적음",
          en: "Has tons of hobbies; started many, finished few.",
        },
      ],
      humor: [
        {
          ko: "리액션 장인. 혼자 빵 터져서 주변까지 웃김",
          en: "A reaction master whose own laughter cracks everyone else up.",
        },
      ],
      friendship: [
        {
          ko: "모두와 친구. 친구의 친구도 내 친구",
          en: "Friends with everyone, including friends of friends.",
        },
      ],
      media: [
        {
          ko: "영화 보고 울고 웃다가 친구들한테 추천 폭탄",
          en: "Laughs and cries through a movie, then floods friends with recommendations.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태에 긍정 에너지로 버티지만 계획은 없음",
          en: "Gets through a zombie outbreak on pure optimism with no plan at all.",
        },
      ],
      drinking: [
        {
          ko: "회식 2차, 3차, 노래방까지 끝까지 남는 파티 요정",
          en: "The party fairy who stays through the second round, the third, and karaoke (노래방).",
        },
      ],
    },
  },
};

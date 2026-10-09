import type { TypeLore } from "@/lore/schema";

export const NT_LORE: Record<"INTJ" | "INTP" | "ENTJ" | "ENTP", TypeLore> = {
  INTJ: {
    nickname: {
      ko: "냉철한 계획러",
      en: "Cold-blooded planner (냉철한 계획러): a mastermind who has already run every scenario",
    },
    summary: [
      {
        ko: "겉으론 무표정, 머릿속엔 10년짜리 계획표가 돌아감",
        en: "Looks expressionless but is quietly running a ten-year plan in their head.",
      },
      {
        ko: "비효율과 무논리를 제일 못 참는 독고다이",
        en: "Can't stand inefficiency or illogical people and prefers to work alone (독고다이, lone wolf).",
      },
      {
        ko: "남한텐 차갑지만 내 사람한텐 은근 츤데레",
        en: "Ice-cold to strangers but quietly tsundere (츤데레, caring under a cold front) with their inner circle.",
      },
    ],
    topics: {
      social: [
        {
          ko: "모임은 이유 있을 때만. 끝나면 바로 집 가서 충전",
          en: "Joins gatherings only when there's a reason and goes straight home afterward to recharge alone.",
        },
      ],
      texting: [
        {
          ko: "용건만 간단히. 이모티콘 없이 '확인', '오케이'",
          en: "Texts only to the point with no emoji, replying 'Noted.' or 'OK', and ends small talk fast.",
        },
        {
          ko: "관심 있는 사람한테만 갑자기 장문 답장",
          en: "Suddenly writes long, thoughtful replies only to someone they're genuinely interested in.",
        },
      ],
      dating: [
        {
          ko: "호감 생기면 상대 분석부터. 고백도 계획적으로",
          en: "Analyzes a crush like a project, plans the confession, and shows love by solving the partner's problems.",
        },
      ],
      conflict: [
        {
          ko: "감정싸움 대신 논리로 반박하고, 계속 무논리면 조용히 손절",
          en: "Argues with cold logic instead of emotion and quietly cuts off (손절) people who stay irrational.",
        },
      ],
      planning: [
        {
          ko: "플랜 A부터 C까지 준비. 갑작스러운 일정 변경 극혐",
          en: "Prepares plans A through C and hates sudden schedule changes.",
        },
        {
          ko: "약속 시간 칼같이 지키고 늦는 사람 은근 체크",
          en: "Arrives exactly on time and silently keeps track of who is late.",
        },
      ],
      work: [
        {
          ko: "조별과제 하면 결국 혼자 다 함. 무능한 팀원 못 참음",
          en: "Ends up doing the whole group project (조별과제) alone because they can't trust slower teammates.",
        },
      ],
      money: [
        {
          ko: "충동구매 거의 없음. 리뷰 비교 끝에 최적템만 삼",
          en: "Rarely buys on impulse, compares reviews until finding the optimal item, and invests on a plan.",
        },
      ],
      emotions: [
        {
          ko: "감정 표현 서툴러 무표정. 위로 대신 해결책을 줌",
          en: "Rarely shows feelings and offers a solution instead of comfort; processes emotions alone.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 혼자 동굴 들어가서 원인부터 분석",
          en: "Retreats alone under stress and analyzes the cause until it is fixed.",
        },
      ],
      food: [
        {
          ko: "검증된 맛집만 감. 모르는 메뉴 도전은 비효율",
          en: "Sticks to proven restaurants; ordering an unknown dish feels like an inefficient gamble.",
        },
      ],
      travel: [
        {
          ko: "동선 효율까지 계산한 일정표 완성. 즉흥 여행 질색",
          en: "Builds an itinerary optimized down to the travel route and hates trips without a plan.",
        },
      ],
      hobbies: [
        {
          ko: "주말엔 혼자 책, 공부, 자기계발. 집이 최고",
          en: "Spends weekends alone reading, studying, or improving themselves; home is the best place.",
        },
      ],
      humor: [
        {
          ko: "무표정으로 던지는 건조한 블랙코미디",
          en: "Delivers dry, deadpan dark humor without changing expression.",
        },
      ],
      friendship: [
        {
          ko: "친구는 적지만 깊게. 손절은 소리 없이 깔끔하게",
          en: "Keeps a few deep friendships and ends the rest silently and cleanly.",
        },
      ],
      media: [
        {
          ko: "개연성 없으면 몰입 깨짐. 극장에선 무표정, 집에서 혼자 찡",
          en: "Loses immersion at plot holes; stone-faced in theaters but may tear up watching alone at home.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태 오면 이미 대피 루트랑 비상식량 확보 완료",
          en: "In a zombie outbreak, already has the escape route mapped and emergency supplies stocked.",
        },
        {
          ko: "패닉 대신 냉정하게 판단. 위기에 오히려 빛남",
          en: "Stays cold-headed instead of panicking and shines when things go wrong.",
        },
      ],
      drinking: [
        {
          ko: "회식은 1차까지만. 2차 얘기 나오면 조용히 사라짐",
          en: "Stays for the first round at most and quietly vanishes when someone suggests a second round (2차).",
        },
      ],
    },
  },
  INTP: {
    nickname: {
      ko: "귀차니즘 학자",
      en: "Lazy professor (귀차니즘 학자): endless thoughts, minimal movement",
    },
    summary: [
      {
        ko: "머릿속은 우주 탐사 중인데 몸은 침대와 합체",
        en: "Their mind is exploring the universe while their body stays fused to the bed.",
      },
      {
        ko: "관심 분야엔 덕후급 몰입, 관심 없으면 1도 신경 안 씀",
        en: "Goes full nerd (덕후) on an interest and doesn't care at all about anything else.",
      },
    ],
    topics: {
      social: [
        {
          ko: "사람 많은 곳은 피곤. 관심사 맞는 사람이랑만 수다",
          en: "Finds crowds draining but will talk for hours with someone who shares a niche interest.",
        },
      ],
      texting: [
        {
          ko: "읽고 까먹어서 답장 늦음. 답은 'ㅇㅋ'",
          en: "Reads a message, forgets to answer for days, then replies with a bare 'ok' (ㅇㅋ).",
        },
        {
          ko: "관심 주제 나오면 갑자기 장문 분석글 투척",
          en: "Suddenly sends a long analytical essay when a topic they love comes up.",
        },
      ],
      dating: [
        {
          ko: "좋아하면 오히려 말 없어짐. 표현 대신 질문만 많아짐",
          en: "Goes quiet around a crush and shows interest by asking lots of curious questions instead of saying it.",
        },
      ],
      conflict: [
        {
          ko: "싸워도 논리 오류부터 지적. '그래서 결론이 뭔데?'",
          en: "In a fight, points out logical errors first and answers emotional talk with 'So what's the conclusion?'",
        },
      ],
      planning: [
        {
          ko: "계획은 머릿속에만 존재. 마감 직전에 몰아서 해결",
          en: "Plans exist only in their head; finishes everything in one burst right before the deadline.",
        },
      ],
      work: [
        {
          ko: "흥미 있으면 천재, 없으면 미루기 장인",
          en: "A genius on interesting tasks and a procrastination master (미루기 장인) on boring ones.",
        },
      ],
      money: [
        {
          ko: "물욕 적음. 대신 장비나 책에 꽂히면 한 번에 지름",
          en: "Has little interest in shopping but splurges all at once on gear or books for a new obsession.",
        },
      ],
      emotions: [
        {
          ko: "감정 고장 난 줄 앎. 위로할 때도 원인 분석부터",
          en: "Seems emotionally offline and comforts friends by analyzing why the problem happened.",
        },
      ],
      stress: [
        {
          ko: "스트레스 받으면 잠수 타고 게임이나 유튜브 정주행",
          en: "Goes off the grid under stress and binges games or YouTube until it passes.",
        },
      ],
      food: [
        {
          ko: "귀찮으면 끼니 거름. 배달 메뉴는 늘 같은 거",
          en: "Skips meals when eating feels like a hassle and reorders the same delivery menu every time.",
        },
      ],
      travel: [
        {
          ko: "여행 가도 숙소에서 쉬는 게 메인. 계획은 남이 짜줌",
          en: "Mostly rests at the hotel on trips and lets someone else make the plan.",
        },
      ],
      hobbies: [
        {
          ko: "위키 정독, 게임, 이상한 주제 파고들기",
          en: "Spends free time reading wikis, gaming, and deep-diving into obscure topics.",
        },
      ],
      humor: [
        {
          ko: "아무도 못 알아듣는 고차원 드립 치고 혼자 웃음",
          en: "Makes high-concept jokes nobody gets and laughs alone.",
        },
      ],
      friendship: [
        {
          ko: "연락 뜸해도 다시 만나면 어제 본 것처럼 편함",
          en: "Rarely keeps in touch, yet picks up with friends as if they met yesterday.",
        },
      ],
      media: [
        {
          ko: "슬픈 장면에서도 '저건 물리적으로 불가능한데' 생각 중",
          en: "During sad scenes is thinking 'that's physically impossible' instead of crying.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태엔 바이러스 원리부터 분석하다 늦게 도망감",
          en: "In a zombie outbreak, analyzes how the virus works first and starts running late.",
        },
      ],
      drinking: [
        {
          ko: "회식 구석에서 조용히 마시다 관심 주제 나오면 폭주",
          en: "Drinks quietly in the corner at 회식 until a favorite topic comes up, then won't stop talking.",
        },
      ],
    },
  },
  ENTJ: {
    nickname: {
      ko: "야망의 회장님",
      en: "The chairman (회장님): a born leader with big ambitions",
    },
    summary: [
      {
        ko: "어딜 가도 자연스럽게 리더 자리 차지. 목표 달성에 집착",
        en: "Ends up in charge wherever they go and is obsessed with hitting goals.",
      },
      {
        ko: "말 빠르고 직설적. 일 못하는 사람 보면 답답해 미침",
        en: "Speaks fast and bluntly and gets visibly frustrated by incompetence.",
      },
    ],
    topics: {
      social: [
        {
          ko: "모임에서 자연스럽게 주도. 인맥도 전략적으로 관리",
          en: "Takes charge of gatherings naturally and manages their network strategically.",
        },
      ],
      texting: [
        {
          ko: "칼답이지만 결론부터. '그래서 언제 어디서?'",
          en: "Replies instantly (칼답) but conclusion-first: 'So when and where?'",
        },
      ],
      dating: [
        {
          ko: "좋아하면 직진. 연애도 목표 세우고 리드함",
          en: "Goes straight at a crush and leads the relationship like a project with goals.",
        },
      ],
      conflict: [
        {
          ko: "논쟁에서 절대 안 짐. 감정보다 결과로 말함",
          en: "Never backs down in an argument and judges by results, not feelings.",
        },
      ],
      planning: [
        {
          ko: "일정 짜고 사람들 역할 분담까지 지시",
          en: "Makes the schedule and assigns everyone their role.",
        },
      ],
      work: [
        {
          ko: "조별과제 조장 1순위. 마감 전에 다 끝내놓음",
          en: "First pick for group project leader (조장) and finishes well before the deadline.",
        },
      ],
      money: [
        {
          ko: "재테크 계획 철저. 돈은 목표 달성 수단",
          en: "Plans investments carefully; money is a tool for reaching goals.",
        },
      ],
      emotions: [
        {
          ko: "눈물은 약점이라 생각. 감정보다 해결책 우선",
          en: "Treats tears as weakness and jumps straight to solutions.",
        },
      ],
      stress: [
        { ko: "스트레스 받으면 일을 더 해서 품", en: "Relieves stress by working even harder." },
      ],
      food: [
        {
          ko: "메뉴 고민하는 사람 대신 바로 결정해줌",
          en: "Decides the menu instantly for indecisive friends.",
        },
      ],
      travel: [
        {
          ko: "여행도 일정표대로 빡빡하게. 낭비하는 시간 없음",
          en: "Runs trips on a tight schedule with no wasted time.",
        },
      ],
      hobbies: [
        {
          ko: "취미도 성과 내야 함. 운동, 자기계발, 사이드 프로젝트",
          en: "Even hobbies need results: workouts, self-improvement, side projects.",
        },
      ],
      humor: [
        {
          ko: "직설적인 팩폭이 웃음 포인트. 본인은 웃기려던 거 아님",
          en: "Their humor comes from blunt hard truths (팩폭) they didn't mean as jokes.",
        },
      ],
      friendship: [
        {
          ko: "친구한테도 조언은 직설. 대신 확실히 도와줌",
          en: "Gives friends blunt advice but helps them for real.",
        },
      ],
      media: [
        {
          ko: "감동보다 주인공의 전략 실수가 더 거슬림",
          en: "Is more bothered by the hero's strategic mistakes than moved by the story.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태 오면 생존자 모아서 바로 리더 됨",
          en: "In a zombie outbreak, gathers survivors and becomes the leader immediately.",
        },
      ],
      drinking: [
        {
          ko: "회식 주도하지만 다음 날 일 생각해서 적당히 끊음",
          en: "Runs the team dinner but stops at the right point for tomorrow's work.",
        },
      ],
    },
  },
  ENTP: {
    nickname: {
      ko: "말싸움 장인",
      en: "Debate master (말싸움 장인): argues for fun and jokes nonstop",
    },
    summary: [
      {
        ko: "반박을 위한 반박. 토론 끝나면 '와 재밌었다'",
        en: "Argues for the sake of arguing and says 'that was fun' when the debate ends.",
      },
      {
        ko: "아이디어 폭발, 마무리는 약함. 새로운 거면 일단 좋음",
        en: "Explodes with ideas but is weak at finishing; loves anything new.",
      },
    ],
    topics: {
      social: [
        {
          ko: "처음 본 사람과도 토론하며 친해짐. 분위기 메이커",
          en: "Befriends strangers through debates and keeps the room lively.",
        },
      ],
      texting: [
        {
          ko: "카톡으로도 토론. 드립이랑 밈 링크 폭탄",
          en: "Debates over chat and floods it with jokes and meme links.",
        },
      ],
      dating: [
        {
          ko: "좋아하면 장난이 심해짐. 밀당 고수",
          en: "Teases a crush relentlessly and is an expert at push-and-pull flirting (밀당).",
        },
      ],
      conflict: [
        {
          ko: "말싸움 즐김. 상대 논리 허점 찾는 게 재미",
          en: "Enjoys verbal fights and loves finding holes in the other side's logic.",
        },
      ],
      planning: [
        {
          ko: "계획은 세우는데 안 지킴. 즉흥 변경 다반사",
          en: "Makes plans but rarely follows them; last-minute changes are normal.",
        },
      ],
      work: [
        {
          ko: "아이디어는 최고, 마무리는 남한테",
          en: "Brings the best ideas but leaves the finishing to others.",
        },
      ],
      money: [
        {
          ko: "새로운 거 보면 일단 지름. 통장은 롤러코스터",
          en: "Buys anything new on impulse; their bank balance is a roller coaster.",
        },
      ],
      emotions: [
        {
          ko: "감정 얘기엔 농담으로 회피. 진지해지면 어색",
          en: "Deflects emotional talk with jokes and gets awkward when things turn serious.",
        },
      ],
      stress: [
        {
          ko: "스트레스는 새로운 일 벌여서 해소",
          en: "Relieves stress by starting something new.",
        },
      ],
      food: [
        {
          ko: "신메뉴, 이상한 조합부터 도전",
          en: "Orders the newest or weirdest combination on the menu first.",
        },
      ],
      travel: [
        {
          ko: "목적지만 정하고 나머진 현장에서 즉흥",
          en: "Picks a destination and improvises everything else on the spot.",
        },
      ],
      hobbies: [
        {
          ko: "취미가 매달 바뀜. 시작은 많고 끝은 적음",
          en: "Changes hobbies every month; many beginnings, few endings.",
        },
      ],
      humor: [
        {
          ko: "드립 장인. 선 넘을락 말락 하는 농담",
          en: "A wordplay (드립) master whose jokes dance right on the line.",
        },
        {
          ko: "분위기 진지해지면 일부러 깨는 담당",
          en: "Deliberately breaks the mood whenever things get too serious.",
        },
      ],
      friendship: [
        {
          ko: "친구랑 놀 때도 논쟁 게임. 의외로 의리 있음",
          en: "Turns hangouts into debate games but is surprisingly loyal.",
        },
      ],
      media: [
        {
          ko: "슬픈 장면에서 개연성 따지거나 결말 예측",
          en: "Picks apart the plot logic or predicts the ending during sad scenes.",
        },
      ],
      crisis: [
        {
          ko: "좀비 사태에서 기상천외한 아이디어로 살아남음",
          en: "Survives a zombie outbreak with outlandish improvised ideas.",
        },
      ],
      drinking: [
        {
          ko: "술자리에 토론 주제 던지고 2차까지 신나게 감",
          en: "Throws out debate topics at drinking parties and happily goes on to the second round (2차).",
        },
      ],
    },
  },
};

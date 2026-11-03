import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import PlumType from "./PlumType.tsx"
import { questions, supplements, results, legacyCodes } from "./quiz.ts"
import type { QuestionCopy, ResultCode, LegacyCode } from "./quiz.ts"

type PlumProps = React.ComponentProps<typeof PlumType>
type ResultCopy = NonNullable<NonNullable<PlumProps["resultCopy"]>[ResultCode]>
type Section = "intro" | "questions" | "ties" | "results" | "brand" | "advanced"
type EditableResult = { name?: string; image?: string; quote?: string; description?: string; tag1?: string; tag2?: string; tag3?: string; hashtags?: string }
type Props = PlumProps & Partial<Record<ResultCode | LegacyCode, EditableResult>> & {
    editorSection?: Section
    questionContent?: Record<string, QuestionCopy>
    tieContent?: Record<string, QuestionCopy>
    v2Question01?: QuestionCopy
    v2Question02?: QuestionCopy
    v2Question03?: QuestionCopy
    v2Question04?: QuestionCopy
    v2Question05?: QuestionCopy
    v2Question06?: QuestionCopy
    v2Question07?: QuestionCopy
    v2Question08?: QuestionCopy
    v2Question09?: QuestionCopy
    v2Question10?: QuestionCopy
    v2Question11?: QuestionCopy
    v2Question12?: QuestionCopy
    v2Question13?: QuestionCopy
    v2Question14?: QuestionCopy
    v2Question15?: QuestionCopy
    v2Question16?: QuestionCopy
    v2Question17?: QuestionCopy
    v2Question18?: QuestionCopy
    v2TieBS?: QuestionCopy
    v2TieTM?: QuestionCopy
    v2TiePR?: QuestionCopy
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 1100
 */
export function PlumFramer(props: Props) {
    const resultAssets: Partial<Record<ResultCode, string>> = {}
    const resultCopy: Partial<Record<ResultCode, ResultCopy>> = {}
    const questionCopy: Record<string, QuestionCopy> = {}
    // Editable text never replaces the source question IDs, axes, or scoring poles.
    if (props.v2Question01) questionCopy["bs1"] = props.v2Question01!
    if (props.v2Question02) questionCopy["bs2"] = props.v2Question02!
    if (props.v2Question03) questionCopy["bs3"] = props.v2Question03!
    if (props.v2Question04) questionCopy["bs4"] = props.v2Question04!
    if (props.v2Question05) questionCopy["bs5"] = props.v2Question05!
    if (props.v2Question06) questionCopy["bs6"] = props.v2Question06!
    if (props.v2Question07) questionCopy["tm1"] = props.v2Question07!
    if (props.v2Question08) questionCopy["tm2"] = props.v2Question08!
    if (props.v2Question09) questionCopy["tm3"] = props.v2Question09!
    if (props.v2Question10) questionCopy["tm4"] = props.v2Question10!
    if (props.v2Question11) questionCopy["tm5"] = props.v2Question11!
    if (props.v2Question12) questionCopy["tm6"] = props.v2Question12!
    if (props.v2Question13) questionCopy["pr1"] = props.v2Question13!
    if (props.v2Question14) questionCopy["pr2"] = props.v2Question14!
    if (props.v2Question15) questionCopy["pr3"] = props.v2Question15!
    if (props.v2Question16) questionCopy["pr4"] = props.v2Question16!
    if (props.v2Question17) questionCopy["pr5"] = props.v2Question17!
    if (props.v2Question18) questionCopy["pr6"] = props.v2Question18!
    if (props.v2TieBS) questionCopy["tieBS"] = props.v2TieBS!
    if (props.v2TieTM) questionCopy["tieTM"] = props.v2TieTM!
    if (props.v2TiePR) questionCopy["tiePR"] = props.v2TiePR!
    for (const code of Object.keys(results) as ResultCode[]) {
        const value = props[code]
        const legacy = (Object.keys(legacyCodes) as LegacyCode[]).find(old => legacyCodes[old] === code)!
        const image = value?.image || props[legacy]?.image
        if (image) resultAssets[code] = image
        if (!value) continue
        const separate = [value.tag1, value.tag2, value.tag3]
        const keywords = separate.every(v => v?.trim())
            ? separate.map(v => v!.trim().replace(/^#/, ""))
            : value.hashtags?.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean)
        resultCopy[code] = {
            ...(value.name?.trim() ? { name: value.name } : {}),
            ...(value.quote ? { title: value.quote } : {}),
            ...(value.description ? { description: value.description } : {}),
            ...(keywords?.length === 3 ? { keywords } : {}),
        }
    }
    return <PlumType {...props} questionCopy={questionCopy} resultAssets={resultAssets} resultCopy={resultCopy} />
}

// Register controls on the SAME exported function, at module scope.
// The metadata below is a literal object: no dynamic generation or nested question groups.
addPropertyControls(PlumFramer, {
    editorSection: {
        type: ControlType.Enum,
        title: "편집할 항목",
        options: ["intro", "questions", "ties", "results", "brand", "advanced"],
        optionTitles: ["기본 문구", "질문 18개", "동점 질문", "결과 8개", "이미지·색상", "고급 연결"],
        defaultValue: "intro",
    },
    headlineLine1: {
        type: ControlType.String,
        title: "메인 타이틀 1행",
        defaultValue: "MY PACE.",
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    headlineLine2: {
        type: ControlType.String,
        title: "메인 타이틀 2행",
        defaultValue: "MY PLUM.",
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    introEyebrow: {
        type: ControlType.String,
        title: "인트로 상단 문구",
        defaultValue: "나를 알아가는 가장 가벼운 시작",
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    introTitle: {
        type: ControlType.String,
        title: "인트로 제목",
        defaultValue: "내가 편안해지는 방식,\n어떤 PLUM일까요?",
        displayTextArea: true,
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    introDescription: {
        type: ControlType.String,
        title: "인트로 설명",
        defaultValue: "감각, 분위기, 나만의 리듬.\n정답 없이 지금의 나를 골라 보세요.",
        displayTextArea: true,
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    introAdultNotice: {
        type: ControlType.String,
        title: "만 19세 이상 안내문",
        defaultValue: "만 19세 이상을 위한 가벼운 자기 탐색 콘텐츠예요. 의학적·심리적 진단이나 검증된 성격 검사가 아니며, 건강 상태 또는 성적 선호를 판단하지 않아요.",
        displayTextArea: true,
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    introStorageNotice: {
        type: ControlType.String,
        title: "답변 저장·새로고침 안내문",
        defaultValue: "답변은 이 화면의 메모리에서만 사용해요.\n새로고침하면 사라집니다. 동점이면 추가 질문이 나와요.",
        displayTextArea: true,
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    codeIntroTitle: {type:ControlType.String,title:"PLUM CODE 제목",defaultValue:"PLUM CODE란?",hidden:props=>(props.editorSection??"intro")!=="intro"},
    codeIntroDescription: {type:ControlType.String,title:"PLUM CODE 설명",displayTextArea:true,defaultValue:"탐색 스타일, 설렘 스타일, 즐기는 방식. 세 가지 취향을 조합한 나의 3글자 코드예요. 정답도 우열도 없어요.",hidden:props=>(props.editorSection??"intro")!=="intro"},
    startLabel: {
        type: ControlType.String,
        title: "시작 버튼",
        defaultValue: "내 PLUM TYPE 찾기",
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    footerText: {
        type: ControlType.String,
        title: "하단 문구",
        defaultValue: "PLEASURE, AT YOUR PACE.",
        hidden: props => (props.editorSection ?? "intro") !== "intro",
    },
    randomizeQuestions: {
        type: ControlType.Boolean,
        title: "질문 순서 섞기",
        defaultValue: false,
        hidden: props => (props.editorSection ?? "intro") !== "questions",
    },
    v2Question01: {
        type: ControlType.Object,
        title: "질문 01",
        defaultValue: {"prompt": "새로운 즐거움이 궁금해졌을 때 나는?", "optionA": "호기심이 생기면 가볍게 알아보고 시도한다", "optionB": "충분히 알아보고 편안할 때 시작한다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "새로운 즐거움이 궁금해졌을 때 나는?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "호기심이 생기면 가볍게 알아보고 시도한다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "충분히 알아보고 편안할 때 시작한다", displayTextArea: true },
        },
    },
    v2Question02: {
        type: ControlType.Object,
        title: "질문 02",
        defaultValue: {"prompt": "눈길을 끄는 토이를 발견했다면?", "optionA": "처음 보는 기능이 가장 궁금하다", "optionB": "사용법과 후기를 먼저 살펴본다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "눈길을 끄는 토이를 발견했다면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "처음 보는 기능이 가장 궁금하다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "사용법과 후기를 먼저 살펴본다", displayTextArea: true },
        },
    },
    v2Question03: {
        type: ControlType.Object,
        title: "질문 03",
        defaultValue: {"prompt": "나도 몰랐던 취향을 발견하는 순간은?", "optionA": "평소와 다른 경험을 해봤을 때", "optionB": "익숙한 경험에서 새로운 매력을 찾았을 때"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "나도 몰랐던 취향을 발견하는 순간은?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "평소와 다른 경험을 해봤을 때", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "익숙한 경험에서 새로운 매력을 찾았을 때", displayTextArea: true },
        },
    },
    v2Question04: {
        type: ControlType.Object,
        title: "질문 04",
        defaultValue: {"prompt": "새로운 제안을 받았을 때 나는?", "optionA": "끌린다면 열린 마음으로 이야기한다", "optionB": "내 마음과 경계를 확인하고 결정한다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "새로운 제안을 받았을 때 나는?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "끌린다면 열린 마음으로 이야기한다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "내 마음과 경계를 확인하고 결정한다", displayTextArea: true },
        },
    },
    v2Question05: {
        type: ControlType.Object,
        title: "질문 05",
        defaultValue: {"prompt": "취향을 알아가는 나의 스타일은?", "optionA": "다양한 가능성을 먼저 탐색하는 편", "optionB": "하나씩 충분히 이해하며 알아가는 편"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "취향을 알아가는 나의 스타일은?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "다양한 가능성을 먼저 탐색하는 편", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "하나씩 충분히 이해하며 알아가는 편", displayTextArea: true },
        },
    },
    v2Question06: {
        type: ControlType.Object,
        title: "질문 06",
        defaultValue: {"prompt": "새로운 경험을 앞둔 나의 첫 반응은?", "optionA": "어떤 재미가 있을지 기대된다", "optionB": "나에게 잘 맞을지 먼저 궁금하다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "새로운 경험을 앞둔 나의 첫 반응은?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "어떤 재미가 있을지 기대된다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "나에게 잘 맞을지 먼저 궁금하다", displayTextArea: true },
        },
    },
    v2Question07: {
        type: ControlType.Object,
        title: "질문 07",
        defaultValue: {"prompt": "설레는 순간 나를 더 끌리게 하는 건?", "optionA": "피부에 닿는 감각과 촉감", "optionB": "눈빛과 음악이 만드는 분위기"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "설레는 순간 나를 더 끌리게 하는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "피부에 닿는 감각과 촉감", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "눈빛과 음악이 만드는 분위기", displayTextArea: true },
        },
    },
    v2Question08: {
        type: ControlType.Object,
        title: "질문 08",
        defaultValue: {"prompt": "토이를 고를 때 먼저 눈길이 가는 건?", "optionA": "촉감과 강도 조절 같은 사용감", "optionB": "디자인과 전체적인 분위기"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "토이를 고를 때 먼저 눈길이 가는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "촉감과 강도 조절 같은 사용감", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "디자인과 전체적인 분위기", displayTextArea: true },
        },
    },
    v2Question09: {
        type: ControlType.Object,
        title: "질문 09",
        defaultValue: {"prompt": "특별한 순간을 떠올리면 먼저 기억나는 건?", "optionA": "몸으로 느꼈던 기분 좋은 감각", "optionB": "그날의 감정과 분위기"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "특별한 순간을 떠올리면 먼저 기억나는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "몸으로 느꼈던 기분 좋은 감각", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "그날의 감정과 분위기", displayTextArea: true },
        },
    },
    v2Question10: {
        type: ControlType.Object,
        title: "질문 10",
        defaultValue: {"prompt": "나만의 시간을 준비한다면?", "optionA": "편안한 촉감과 내가 좋아하는 감각부터", "optionB": "조명, 영상, 음악으로 분위기부터"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "나만의 시간을 준비한다면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "편안한 촉감과 내가 좋아하는 감각부터", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "조명, 영상, 음악으로 분위기부터", displayTextArea: true },
        },
    },
    v2Question11: {
        type: ControlType.Object,
        title: "질문 11",
        defaultValue: {"prompt": "설렘이 시작되는 순간은?", "optionA": "가벼운 스킨십이나 감각적인 자극이 느껴질 때", "optionB": "눈빛이나 말 한마디에 상상이 시작될 때"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "설렘이 시작되는 순간은?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "가벼운 스킨십이나 감각적인 자극이 느껴질 때", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "눈빛이나 말 한마디에 상상이 시작될 때", displayTextArea: true },
        },
    },
    v2Question12: {
        type: ControlType.Object,
        title: "질문 12",
        defaultValue: {"prompt": "나를 더 오래 설레게 하는 건?", "optionA": "몸으로 기억하는 기분 좋은 감각", "optionB": "자꾸 떠오르는 장면과 그때의 감정"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "나를 더 오래 설레게 하는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "몸으로 기억하는 기분 좋은 감각", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "자꾸 떠오르는 장면과 그때의 감정", displayTextArea: true },
        },
    },
    v2Question13: {
        type: ControlType.Object,
        title: "질문 13",
        defaultValue: {"prompt": "기분 좋은 시간을 특별하게 만드는 건?", "optionA": "예상 못 한 작은 장난과 변화", "optionB": "내가 좋아하는 익숙한 흐름"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "기분 좋은 시간을 특별하게 만드는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "예상 못 한 작은 장난과 변화", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "내가 좋아하는 익숙한 흐름", displayTextArea: true },
        },
    },
    v2Question14: {
        type: ControlType.Object,
        title: "질문 14",
        defaultValue: {"prompt": "토이를 사용한다면 더 끌리는 건?", "optionA": "여러 기능을 바꿔 보며 탐색하기", "optionB": "마음에 드는 설정을 찾아 즐기기"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "토이를 사용한다면 더 끌리는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "여러 기능을 바꿔 보며 탐색하기", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "마음에 드는 설정을 찾아 즐기기", displayTextArea: true },
        },
    },
    v2Question15: {
        type: ControlType.Object,
        title: "질문 15",
        defaultValue: {"prompt": "혼자 또는 함께하는 시간에 나는?", "optionA": "그날의 기분에 따라 즉흥적으로", "optionB": "편안한 속도와 나만의 리듬으로"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "혼자 또는 함께하는 시간에 나는?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "그날의 기분에 따라 즉흥적으로", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "편안한 속도와 나만의 리듬으로", displayTextArea: true },
        },
    },
    v2Question16: {
        type: ControlType.Object,
        title: "질문 16",
        defaultValue: {"prompt": "내 취향을 한마디로 표현하면?", "optionA": "오늘은 또 어떤 재미가 있을까?", "optionB": "내가 좋아하는 건 확실히 알지!"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "내 취향을 한마디로 표현하면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "오늘은 또 어떤 재미가 있을까?", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "내가 좋아하는 건 확실히 알지!", displayTextArea: true },
        },
    },
    v2Question17: {
        type: ControlType.Object,
        title: "질문 17",
        defaultValue: {"prompt": "마음에 드는 경험을 발견했다면?", "optionA": "다른 방식으로도 즐겨보고 싶다", "optionB": "그 느낌을 다시 경험하고 싶다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "마음에 드는 경험을 발견했다면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "다른 방식으로도 즐겨보고 싶다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "그 느낌을 다시 경험하고 싶다", displayTextArea: true },
        },
    },
    v2Question18: {
        type: ControlType.Object,
        title: "질문 18",
        defaultValue: {"prompt": "계획에 없던 즐거운 순간이 생긴다면?", "optionA": "흐름에 맡기고 새롭게 즐긴다", "optionB": "내가 편안한 방식으로 즐긴다"},
        hidden: props => (props.editorSection ?? "intro") !== "questions",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "계획에 없던 즐거운 순간이 생긴다면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "흐름에 맡기고 새롭게 즐긴다", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "내가 편안한 방식으로 즐긴다", displayTextArea: true },
        },
    },
    v2TieBS: {
        type: ControlType.Object,
        title: "BS 보충 질문",
        defaultValue: {"prompt": "낯선 즐거움 앞에서 나는?", "optionA": "궁금하면 도전", "optionB": "천천히 알아보기"},
        hidden: props => (props.editorSection ?? "intro") !== "ties",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "낯선 즐거움 앞에서 나는?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (B)", defaultValue: "궁금하면 도전", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (S)", defaultValue: "천천히 알아보기", displayTextArea: true },
        },
    },
    v2TieTM: {
        type: ControlType.Object,
        title: "TM 보충 질문",
        defaultValue: {"prompt": "나를 더 설레게 하는 건?", "optionA": "직접 느끼는 감각", "optionB": "감정과 분위기"},
        hidden: props => (props.editorSection ?? "intro") !== "ties",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "나를 더 설레게 하는 건?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (T)", defaultValue: "직접 느끼는 감각", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (M)", defaultValue: "감정과 분위기", displayTextArea: true },
        },
    },
    v2TiePR: {
        type: ControlType.Object,
        title: "PR 보충 질문",
        defaultValue: {"prompt": "오늘의 즐거움을 고른다면?", "optionA": "즉흥적인 변화", "optionB": "익숙한 리듬"},
        hidden: props => (props.editorSection ?? "intro") !== "ties",
        controls: {
            prompt: { type: ControlType.String, title: "질문 문구", defaultValue: "오늘의 즐거움을 고른다면?", displayTextArea: true },
            optionA: { type: ControlType.String, title: "선택지 A 기준 (P)", defaultValue: "즉흥적인 변화", displayTextArea: true },
            optionB: { type: ControlType.String, title: "선택지 B 기준 (R)", defaultValue: "익숙한 리듬", displayTextArea: true },
        },
    },
    BTP: {
        type: ControlType.Object,
        title: "BTP 결과",
        defaultValue: {"name": "짜릿한 탐험가", "quote": "야한 호기심은 못 참지", "description": "새로운 기능에는 눈이 반짝, 마음에 드는 감각에는 집중 모드. 익숙한 공식보다 오늘의 호기심을 따라가는 편이에요. 혼자든 함께든, 끌리는 재미는 내 경계 안에서 가볍게 탐색해요.", "tag1": "대담한호기심", "tag2": "감각탐색", "tag3": "즉흥모드"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "짜릿한 탐험가" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "야한 호기심은 못 참지" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로운 기능에는 눈이 반짝, 마음에 드는 감각에는 집중 모드. 익숙한 공식보다 오늘의 호기심을 따라가는 편이에요. 혼자든 함께든, 끌리는 재미는 내 경계 안에서 가볍게 탐색해요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "대담한호기심" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "감각탐색" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "즉흥모드" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    BTR: {
        type: ControlType.Object,
        title: "BTR 결과",
        defaultValue: {"name": "감각 컬렉터", "quote": "취향에도 디테일이 있거든", "description": "새로움은 좋아하지만 아무 느낌이나 수집하진 않아요. 촉감, 강도, 편안한 리듬까지 내 기준으로 꼼꼼히 고르는 편. 마음에 드는 감각을 발견하면 나만의 설정으로 오래 즐겨요.", "tag1": "감각디테일", "tag2": "취향수집", "tag3": "나만의설정"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "감각 컬렉터" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "취향에도 디테일이 있거든" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로움은 좋아하지만 아무 느낌이나 수집하진 않아요. 촉감, 강도, 편안한 리듬까지 내 기준으로 꼼꼼히 고르는 편. 마음에 드는 감각을 발견하면 나만의 설정으로 오래 즐겨요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "감각디테일" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "취향수집" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "나만의설정" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    BMP: {
        type: ControlType.Object,
        title: "BMP 결과",
        defaultValue: {"name": "무드왕 플러터", "quote": "분위기 잡는 건 내가 1등", "description": "조명 하나, 말 한마디에도 오늘의 시나리오가 바뀌어요. 새로운 무드에 열려 있고 즉흥적인 변화도 반가운 편. 혼자 상상에 빠져도, 파트너와 장난을 나눠도 분위기는 내가 고른 템포로.", "tag1": "무드메이커", "tag2": "상상스위치", "tag3": "즉흥플러팅"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "무드왕 플러터" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "분위기 잡는 건 내가 1등" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "조명 하나, 말 한마디에도 오늘의 시나리오가 바뀌어요. 새로운 무드에 열려 있고 즉흥적인 변화도 반가운 편. 혼자 상상에 빠져도, 파트너와 장난을 나눠도 분위기는 내가 고른 템포로.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "무드메이커" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "상상스위치" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "즉흥플러팅" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    BMR: {
        type: ControlType.Object,
        title: "BMR 결과",
        defaultValue: {"name": "로맨틱 디렉터", "quote": "설렘도 내 방식대로", "description": "새로운 장면을 상상하되 연출에는 나만의 기준이 있어요. 좋아하는 음악과 조명, 편안한 순서까지 챙기는 편. 낯선 설렘도 내 리듬에 들어오면 제법 오래 머물러요.", "tag1": "설렘연출", "tag2": "무드디테일", "tag3": "취향루틴"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "로맨틱 디렉터" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "설렘도 내 방식대로" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로운 장면을 상상하되 연출에는 나만의 기준이 있어요. 좋아하는 음악과 조명, 편안한 순서까지 챙기는 편. 낯선 설렘도 내 리듬에 들어오면 제법 오래 머물러요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "설렘연출" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "무드디테일" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "취향루틴" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    STP: {
        type: ControlType.Object,
        title: "STP 결과",
        defaultValue: {"name": "반전 플레이어", "quote": "얌전한 줄 알았지?", "description": "처음엔 내 마음과 경계부터 확인해요. 하지만 편안해지면 작은 장난과 새로운 감각에 반전 스위치가 켜지는 편. 서두르지 않는 시작과 즉흥적인 재미는 충분히 함께할 수 있죠.", "tag1": "편안한시작", "tag2": "반전스위치", "tag3": "감각플레이"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "반전 플레이어" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "얌전한 줄 알았지?" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "처음엔 내 마음과 경계부터 확인해요. 하지만 편안해지면 작은 장난과 새로운 감각에 반전 스위치가 켜지는 편. 서두르지 않는 시작과 즉흥적인 재미는 충분히 함께할 수 있죠.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "편안한시작" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "반전스위치" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "감각플레이" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    STR: {
        type: ControlType.Object,
        title: "STR 결과",
        defaultValue: {"name": "소프트 러버", "quote": "순한 맛이라고 아다는 아님", "description": "천천히 시작해도 좋아하는 느낌은 꽤 분명한 편이에요. 몸이 편안한 촉감과 익숙한 리듬을 소중히 챙겨요. 강한 변화보다 나에게 딱 맞는 설정, 부드럽지만 확실한 취향을 즐겨요.", "tag1": "부드러운확신", "tag2": "편안한감각", "tag3": "익숙한리듬"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "소프트 러버" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "순한 맛이라고 아다는 아님" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "천천히 시작해도 좋아하는 느낌은 꽤 분명한 편이에요. 몸이 편안한 촉감과 익숙한 리듬을 소중히 챙겨요. 강한 변화보다 나에게 딱 맞는 설정, 부드럽지만 확실한 취향을 즐겨요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "부드러운확신" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "편안한감각" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "익숙한리듬" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    SMP: {
        type: ControlType.Object,
        title: "SMP 결과",
        defaultValue: {"name": "시크릿 플레이어", "quote": "내 비밀 취향은 나만 알지", "description": "취향을 아무 데서나 공개하진 않지만 상상력까지 조용한 건 아니에요. 안심되는 공간과 분위기가 갖춰지면 그날의 기분대로 변화를 즐기는 편. 나만 알던 장면을 꺼낼 타이밍도 내가 정해요.", "tag1": "비밀무드", "tag2": "상상플레이", "tag3": "나의타이밍"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "시크릿 플레이어" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "내 비밀 취향은 나만 알지" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "취향을 아무 데서나 공개하진 않지만 상상력까지 조용한 건 아니에요. 안심되는 공간과 분위기가 갖춰지면 그날의 기분대로 변화를 즐기는 편. 나만 알던 장면을 꺼낼 타이밍도 내가 정해요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "비밀무드" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "상상플레이" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "나의타이밍" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    SMR: {
        type: ControlType.Object,
        title: "SMR 결과",
        defaultValue: {"name": "슬로우 로맨티스트", "quote": "천천히 빠져드는 스타일", "description": "급하게 불붙이기보다 편안한 분위기 안에서 마음이 움직이는 편이에요. 좋아하는 음악, 익숙한 공간, 나만의 순서가 설렘의 시작점. 혼자든 함께든 내 속도를 존중하는 순간이 오래 기억에 남아요.", "tag1": "느린설렘", "tag2": "편안한무드", "tag3": "나만의속도"},
        hidden: props => (props.editorSection ?? "intro") !== "results",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "슬로우 로맨티스트" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "천천히 빠져드는 스타일" },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "급하게 불붙이기보다 편안한 분위기 안에서 마음이 움직이는 편이에요. 좋아하는 음악, 익숙한 공간, 나만의 순서가 설렘의 시작점. 혼자든 함께든 내 속도를 존중하는 순간이 오래 기억에 남아요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "느린설렘" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "편안한무드" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "나만의속도" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    characterUrl: {
        type: ControlType.Image,
        title: "공식 마스터 이미지",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    characterAlt: {
        type: ControlType.String,
        title: "이미지 대체 텍스트",
        defaultValue: "PLUM 공식 캐릭터",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    orange: {
        type: ControlType.Color,
        title: "주황",
        defaultValue: "#F36B38",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    cream: {
        type: ControlType.Color,
        title: "크림",
        defaultValue: "#FFF0D8",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    wine: {
        type: ControlType.Color,
        title: "와인",
        defaultValue: "#8A3141",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    ink: {
        type: ControlType.Color,
        title: "글자",
        defaultValue: "#292522",
        hidden: props => (props.editorSection ?? "intro") !== "brand",
    },
    eyebrowLayer: {
        type: ControlType.ComponentInstance,
        title: "상단 문구 레이어",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    headlineLayer: {
        type: ControlType.ComponentInstance,
        title: "메인 타이틀 레이어",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    introTitleLayer: {
        type: ControlType.ComponentInstance,
        title: "소개 제목 레이어",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    introDescriptionLayer: {
        type: ControlType.ComponentInstance,
        title: "소개 설명 레이어",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    footerLayer: {
        type: ControlType.ComponentInstance,
        title: "하단 문구 레이어",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    shareBaseUrl: {
        type: ControlType.String,
        title: "공유 페이지 URL",
        defaultValue: "",
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    analyticsEnabled: {
        type: ControlType.Boolean,
        title: "분석 이벤트 사용",
        defaultValue: false,
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
    },
    ESP: {
        type: ControlType.Object,
        title: "1.0 보관 · ESP",
        defaultValue: {"name": "짜릿한 탐험가", "quote": "새로운 순간에, 가볍게 한 걸음.", "description": "새로움을 발견하고 감각적인 순간을 자유롭게 즐기는 편이에요. 작은 호기심도 내 속도에 맞춰 탐색해 보세요.", "tag1": "호기심", "tag2": "감각", "tag3": "자유"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "짜릿한 탐험가" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "새로운 순간에, 가볍게 한 걸음." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로움을 발견하고 감각적인 순간을 자유롭게 즐기는 편이에요. 작은 호기심도 내 속도에 맞춰 탐색해 보세요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "호기심" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "감각" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "자유" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    ESR: {
        type: ControlType.Object,
        title: "1.0 보관 · ESR",
        defaultValue: {"name": "섬세한 감각가", "quote": "작은 감각도, 나답게 깊이.", "description": "새로운 경험 속에서도 섬세한 감각과 나만의 리듬을 챙겨요. 좋아하는 느낌을 천천히 쌓아가는 시간이 잘 어울려요.", "tag1": "탐색", "tag2": "섬세함", "tag3": "리듬"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "섬세한 감각가" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "작은 감각도, 나답게 깊이." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로운 경험 속에서도 섬세한 감각과 나만의 리듬을 챙겨요. 좋아하는 느낌을 천천히 쌓아가는 시간이 잘 어울려요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "탐색" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "섬세함" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "리듬" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    EMP: {
        type: ControlType.Object,
        title: "1.0 보관 · EMP",
        defaultValue: {"name": "무드 플레이어", "quote": "분위기를 바꾸면, 오늘도 새롭게.", "description": "새로운 분위기와 즉흥적인 즐거움에 마음이 움직여요. 음악 한 곡, 빛 하나로 나를 위한 시간을 만들어 보세요.", "tag1": "새로움", "tag2": "무드", "tag3": "즉흥"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "무드 플레이어" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "분위기를 바꾸면, 오늘도 새롭게." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로운 분위기와 즉흥적인 즐거움에 마음이 움직여요. 음악 한 곡, 빛 하나로 나를 위한 시간을 만들어 보세요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "새로움" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "무드" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "즉흥" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    EMR: {
        type: ControlType.Object,
        title: "1.0 보관 · EMR",
        defaultValue: {"name": "로맨틱 드리머", "quote": "상상한 무드를, 나만의 의식으로.", "description": "새로운 이야기에 열려 있으면서도 나만의 시간을 소중히 해요. 취향이 담긴 공간과 루틴이 편안한 시작이 될 수 있어요.", "tag1": "상상", "tag2": "분위기", "tag3": "루틴"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "로맨틱 드리머" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "상상한 무드를, 나만의 의식으로." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "새로운 이야기에 열려 있으면서도 나만의 시간을 소중히 해요. 취향이 담긴 공간과 루틴이 편안한 시작이 될 수 있어요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "상상" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "분위기" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "루틴" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    CSP: {
        type: ControlType.Object,
        title: "1.0 보관 · CSP",
        defaultValue: {"name": "수줍은 모험가", "quote": "편안한 경계 안에서, 작은 발견.", "description": "안심할 수 있는 환경에서 작은 변화를 즐기는 편이에요. 충분히 편안할 때 호기심을 따라가도 좋아요.", "tag1": "안심", "tag2": "작은 변화", "tag3": "감각"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "수줍은 모험가" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "편안한 경계 안에서, 작은 발견." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "안심할 수 있는 환경에서 작은 변화를 즐기는 편이에요. 충분히 편안할 때 호기심을 따라가도 좋아요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "안심" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "작은 변화" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "감각" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    CSR: {
        type: ControlType.Object,
        title: "1.0 보관 · CSR",
        defaultValue: {"name": "포근한 현실주의자", "quote": "나에게 맞는 편안함이 먼저.", "description": "익숙한 감각과 꾸준한 루틴을 아껴요. 내 몸과 마음에 맞는 선택을 차분하게 알아가는 시간이 잘 어울려요.", "tag1": "편안함", "tag2": "신중함", "tag3": "꾸준함"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "포근한 현실주의자" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "나에게 맞는 편안함이 먼저." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "익숙한 감각과 꾸준한 루틴을 아껴요. 내 몸과 마음에 맞는 선택을 차분하게 알아가는 시간이 잘 어울려요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "편안함" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "신중함" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "꾸준함" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    CMP: {
        type: ControlType.Object,
        title: "1.0 보관 · CMP",
        defaultValue: {"name": "비밀스러운 취향러", "quote": "조용한 취향 속, 자유로운 무드.", "description": "편안한 공간에서 그날의 분위기를 자유롭게 즐겨요. 누구의 기준보다 내가 좋아하는 감정과 속도를 믿어 보세요.", "tag1": "취향", "tag2": "무드", "tag3": "자유"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "비밀스러운 취향러" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "조용한 취향 속, 자유로운 무드." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "편안한 공간에서 그날의 분위기를 자유롭게 즐겨요. 누구의 기준보다 내가 좋아하는 감정과 속도를 믿어 보세요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "취향" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "무드" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "자유" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
    CMR: {
        type: ControlType.Object,
        title: "1.0 보관 · CMR",
        defaultValue: {"name": "다정한 홈러버", "quote": "익숙한 공간에서, 나를 다정하게.", "description": "안정적인 분위기와 익숙한 의식이 에너지를 채워줘요. 나에게 다정한 작은 루틴을 이어가 보세요.", "tag1": "안정", "tag2": "다정함", "tag3": "루틴"},
        hidden: props => (props.editorSection ?? "intro") !== "advanced",
        controls: {
            name: { type: ControlType.String, title: "결과 이름", defaultValue: "다정한 홈러버" },
            quote: { type: ControlType.String, title: "한 줄 인용", defaultValue: "익숙한 공간에서, 나를 다정하게." },
            description: { type: ControlType.String, title: "성향 설명", defaultValue: "안정적인 분위기와 익숙한 의식이 에너지를 채워줘요. 나에게 다정한 작은 루틴을 이어가 보세요.", displayTextArea: true },
            tag1: { type: ControlType.String, title: "해시태그 1", defaultValue: "안정" },
            tag2: { type: ControlType.String, title: "해시태그 2", defaultValue: "다정함" },
            tag3: { type: ControlType.String, title: "해시태그 3", defaultValue: "루틴" },
            image: { type: ControlType.Image, title: "공식 결과 이미지" },
        },
    },
})

export default PlumFramer

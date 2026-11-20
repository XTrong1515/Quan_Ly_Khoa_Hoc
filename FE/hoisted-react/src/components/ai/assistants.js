import { Compass, Route, Lightbulb, Bug, LayoutList, PenLine, ListChecks, Wallet } from 'lucide-react';

/**
 * Hai trợ lý dùng chung khung chat — khác nhau ở API, trang toàn màn hình và lời mở đầu.
 * BE tách lịch sử theo ai_conversations.kind nên mỗi trợ lý chỉ thấy hội thoại của mình.
 */
export const ASSISTANTS = {
  learner: {
    id: 'learner',
    api: '/api/ai',
    page: '/assistant',
    name: 'Trợ lý học tập',
    intro: 'Hỏi về lộ trình, khóa học hợp trình độ của bạn, hoặc nhờ giải thích một khái niệm JavaScript.',
    placeholder: 'Hỏi về khóa học, lộ trình hay JavaScript…',
    suggestions: [
      { icon: Compass,   text: 'Mình mới học lập trình, nên bắt đầu từ khóa nào?' },
      { icon: Route,     text: 'Lộ trình từ JavaScript cơ bản tới React developer?' },
      { icon: Lightbulb, text: 'Giải thích closure trong JavaScript kèm ví dụ' },
      { icon: Bug,       text: 'Vì sao this bị undefined trong callback?' },
    ],
  },
  instructor: {
    id: 'instructor',
    api: '/api/instructor/ai',
    page: '/instructor/assistant',
    name: 'Trợ lý giảng dạy',
    intro: 'Lên dàn ý khóa học, soạn bài, nghĩ câu hỏi quiz, bài tập code — hoặc hỏi về quy trình duyệt và doanh thu trên Hoisted.',
    placeholder: 'Hỏi về soạn bài, quiz, quy trình duyệt…',
    suggestions: [
      { icon: LayoutList, text: 'Gợi ý dàn ý cho khóa “Async JavaScript” 6 chương' },
      { icon: PenLine,    text: 'Soạn dàn ý bài giảng về event loop cho người mới' },
      { icon: ListChecks, text: 'Khóa của mình đang ở trạng thái nào, cần làm gì tiếp?' },
      { icon: Wallet,     text: 'Doanh thu và tiền chi trả được tính thế nào?' },
    ],
  },
};

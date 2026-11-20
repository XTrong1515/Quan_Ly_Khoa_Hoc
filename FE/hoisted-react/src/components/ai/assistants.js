import { Compass, Route, Lightbulb, Bug, LayoutList, PenLine, ListChecks, Wallet, FileText, Repeat, HelpCircle, Wrench } from 'lucide-react';

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
    emptyTitle: 'Trợ lý học tập Hoisted',
    intro: 'Hỏi về lộ trình, khóa học hợp trình độ của bạn, hoặc nhờ giải thích một khái niệm JavaScript.',
    placeholder: 'Hỏi về khóa học, lộ trình hay JavaScript…',
    suggestions: [
      { icon: Compass,   text: 'Mình mới học lập trình, nên bắt đầu từ khóa nào?' },
      { icon: Route,     text: 'Lộ trình từ JavaScript cơ bản tới React developer?' },
      { icon: Lightbulb, text: 'Giải thích closure trong JavaScript kèm ví dụ' },
      { icon: Bug,       text: 'Vì sao this bị undefined trong callback?' },
    ],
  },
  // Trợ lý trong trang học: cùng API & lịch sử với trợ lý học viên, gửi kèm lessonId khi bắt đầu hội thoại
  lesson: {
    id: 'lesson',
    history: 'learner',
    api: '/api/ai',
    page: '/assistant',
    name: 'Hỏi AI về bài này',
    emptyTitle: 'Hỏi gì về bài đang học cũng được',
    intro: 'Trợ lý đã đọc nội dung bài đang mở. Hỏi lại chỗ chưa hiểu, nhờ ví dụ khác hay câu hỏi tự kiểm tra — với bài tập, trợ lý chỉ gợi ý hướng làm, không đưa lời giải.',
    placeholder: 'Hỏi về bài đang học…',
    suggestions: [
      { icon: FileText,   text: 'Tóm tắt ý chính của bài này' },
      { icon: Repeat,     text: 'Giải thích lại phần khó nhất bằng ví dụ khác' },
      { icon: HelpCircle, text: 'Cho mình 3 câu hỏi để tự kiểm tra' },
      { icon: Wrench,     text: 'Gợi ý hướng làm bài tập (không cần lời giải)' },
    ],
  },
  instructor: {
    id: 'instructor',
    api: '/api/instructor/ai',
    page: '/instructor/assistant',
    name: 'Trợ lý giảng dạy',
    emptyTitle: 'Trợ lý giảng dạy Hoisted',
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

import { Seo } from '@/components/seo.jsx';
import { AssistantWorkspace } from '@/components/ai/assistant-workspace.jsx';
import { ASSISTANTS } from '@/components/ai/assistants.js';

/** Trợ lý giảng dạy trong Instructor studio — biết khóa học, trạng thái duyệt và số dư của chính giảng viên. */
export default function InstructorAssistantPage() {
  return (
    <>
      <Seo title="Trợ lý giảng dạy — Hoisted" description="Trợ lý AI giúp giảng viên soạn khóa học, bài giảng và vận hành trên Hoisted." />
      {/* Console: thanh trên 56px dưới lg, toàn chiều cao từ lg */}
      <AssistantWorkspace assistant={ASSISTANTS.instructor} className="h-[calc(100dvh-56px)] lg:h-dvh min-h-[480px]" />
    </>
  );
}

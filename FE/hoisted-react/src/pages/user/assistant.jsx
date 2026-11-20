import { Seo } from '@/components/seo.jsx';
import { AssistantWorkspace } from '@/components/ai/assistant-workspace.jsx';
import { ASSISTANTS } from '@/components/ai/assistants.js';

/** Trang trợ lý AI toàn màn hình cho học viên — lịch sử hội thoại + khung chat, cao đúng phần dưới thanh điều hướng. */
export default function AssistantPage() {
  return (
    <>
      <Seo title="Trợ lý AI — Hoisted" description="Hỏi trợ lý AI về lộ trình học và khóa học JavaScript phù hợp." />
      <AssistantWorkspace assistant={ASSISTANTS.learner}
        className="h-[calc(100dvh-64px)] min-h-[480px] max-w-[1280px] mx-auto md:border-x border-line" />
    </>
  );
}

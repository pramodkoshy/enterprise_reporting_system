'use client';

import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import { NlQueryWorkspace } from '@/components/nl-query/nl-query-workspace';

export default function NlQueryPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <NlQueryWorkspace />
    </CopilotKit>
  );
}

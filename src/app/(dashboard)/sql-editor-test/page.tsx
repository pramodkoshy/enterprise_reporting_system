'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function SQLEditorTestPage() {
  return (
    <div className="h-[calc(100vh-8rem)] p-4">
      <h1 className="text-2xl font-bold mb-4">Panel Test</h1>

      <ResizablePanelGroup orientation="horizontal" className="h-full border rounded-lg">
        <ResizablePanel defaultSize={20} minSize={10} maxSize={40}>
          <div className="h-full bg-blue-100 dark:bg-blue-900/30 p-4">
            <h2 className="font-bold">Left Panel (Schema)</h2>
            <p className="text-sm">This should be 20% width</p>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={80} minSize={60}>
          <ResizablePanelGroup orientation="vertical" className="h-full">
            <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
              <div className="h-full bg-green-100 dark:bg-green-900/30 p-4">
                <h2 className="font-bold">Top Panel (SQL Editor)</h2>
                <p className="text-sm">This should be 50% height</p>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={20} maxSize={80}>
              <div className="h-full bg-orange-100 dark:bg-orange-900/30 p-4">
                <h2 className="font-bold">Bottom Panel (Results)</h2>
                <p className="text-sm">This should be 50% height</p>
                <p className="text-xs mt-2">You should see this panel!</p>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TaskpaneApp } from '../components/TaskpaneApp';

Office.onReady(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(React.createElement(TaskpaneApp));
});

// js/actions.js
// Action-item helpers

import { generateId, today } from './utils.js';

/** Create a new action item */
function createActionItem(description = '', assignee = '', dueDate = '', priority = 'medium') {
  return {
    id: generateId(),
    description,
    assignee,
    dueDate: dueDate || today(),
    priority,
    status: 'open'
  };
}

/** Add an action item to the list */
function addActionItem(items, item) {
  return [...items, item];
}

/** Remove an action item by id */
function removeActionItem(items, id) {
  return items.filter(i => i.id !== id);
}

/** Update fields on an action item */
function updateActionItem(items, id, changes) {
  return items.map(i => i.id === id ? { ...i, ...changes } : i);
}

/** Toggle an action item between open and done */
function toggleActionStatus(items, id) {
  return items.map(i => {
    if (i.id !== id) return i;
    const next = i.status === 'done' ? 'open' : 'done';
    return { ...i, status: next };
  });
}

/** Count open action items */
function openCount(items) {
  return items.filter(i => i.status !== 'done').length;
}

export { createActionItem, addActionItem, removeActionItem, updateActionItem, toggleActionStatus, openCount };

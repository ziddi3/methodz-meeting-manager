// js/decisions.js
// Decision-tracking helpers

import { generateId } from './utils.js';

/** Create a new decision record */
function createDecision(description = '', madeBy = '') {
  return {
    id: generateId(),
    description,
    madeBy,
    timestamp: new Date().toISOString()
  };
}

/** Add a decision to the list */
function addDecision(decisions, decision) {
  return [...decisions, decision];
}

/** Remove a decision by id */
function removeDecision(decisions, id) {
  return decisions.filter(d => d.id !== id);
}

/** Update a decision's fields */
function updateDecision(decisions, id, changes) {
  return decisions.map(d => d.id === id ? { ...d, ...changes } : d);
}

export { createDecision, addDecision, removeDecision, updateDecision };

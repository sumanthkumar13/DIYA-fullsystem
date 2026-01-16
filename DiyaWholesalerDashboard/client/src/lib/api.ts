// ✅ Enterprise rule: Single axios instance in the project.
// This file only re-exports the shared axios instance to avoid breaking old imports.

export { default } from "./axios";
export { api } from "./axios";

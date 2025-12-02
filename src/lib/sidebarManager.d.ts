import { AppState } from '../types';

declare function collectButtonRefs(sidebarMain: HTMLElement): HTMLElement[];

declare function computeOrderedButtons(
  appState: AppState,
  buttonRefs: HTMLElement[]
): HTMLElement[];

declare function applySidebarState({
  sidebarMain,
  welcomeButton,
  buttonRefs,
  appState,
}: {
  sidebarMain: HTMLElement;
  welcomeButton: HTMLElement;
  buttonRefs: HTMLElement[];
  appState: AppState;
}): void;

export { collectButtonRefs, computeOrderedButtons, applySidebarState };

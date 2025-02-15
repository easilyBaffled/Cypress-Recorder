/**
 * Where the magic happens.
 *
 * Responsible for recording the DOM events.
 */
import finder from "@medv/finder";
import $ from "jquery";
import type { ParsedEvent } from "../types";
import { EventType } from "../constants";

let port: chrome.runtime.Port;

/**
 * Parses DOM events into an object with the necessary data.
 * @param event
 * @returns {ParsedEvent}
 */
function parseEvent(event: Event): ParsedEvent {
    let selector: string;
    if ((event.target as Element).hasAttribute("data-cy"))
        selector = `[data-cy=${(event.target as Element).getAttribute(
            "data-cy"
        )}]`;
    else if ((event.target as Element).hasAttribute("data-test"))
        selector = `[data-test=${(event.target as Element).getAttribute(
            "data-test"
        )}]`;
    else if ((event.target as Element).hasAttribute("data-testid"))
        selector = `[data-testid=${(event.target as Element).getAttribute(
            "data-testid"
        )}]`;
    else
        selector = finder(event.target as Element, {
            attr: (name, value) => {
                return (
                    name === "data-cy" ||
                    name === "data-test" ||
                    name === "data-testid"
                );
            }
        });
    // @ts-ignore
    const innerText = event.target.innerText || null; // TODO: should test if this works
    const shouldUseContains =
        innerText &&
        $(`body :contains('${innerText}')`).filter((i, el) => {
            return [...el.childNodes].some(
                (el) => el.nodeType === 3 && el.textContent.includes(innerText)
            );
        }).length === 1;
    const shouldUseGetContains =
        innerText &&
        !shouldUseContains &&
        $(`body :contains('${innerText}'):visible`).filter((i, el) => {
            return [...el.childNodes].some(
                (el) => el.nodeType === 3 && el.textContent.includes(innerText)
            );
        }).length === 1;
    const parsedEvent: ParsedEvent = {
        selector,
        innerText,
        shouldUseContains,
        shouldUseGetContains,
        action: event.type,
        tag: (event.target as Element).tagName,
        value: (event.target as HTMLInputElement).value
    };
    if ((event.target as HTMLAnchorElement).hasAttribute("href"))
        parsedEvent.href = (event.target as HTMLAnchorElement).href;
    if ((event.target as Element).hasAttribute("id"))
        parsedEvent.id = (event.target as Element).id;
    if (parsedEvent.tag === "INPUT")
        parsedEvent.inputType = (event.target as HTMLInputElement).type;
    if (event.type === "keydown")
        parsedEvent.key = (event as KeyboardEvent).key;
    return parsedEvent;
}

/**
 * Checks if DOM event was triggered by user; if so, it calls parseEvent on the data.
 * @param event
 */
function handleEvent(event: Event): void {
    if (event.isTrusted === true) port.postMessage(parseEvent(event));
}

/**
 * Adds event listeners to the DOM.
 */
function addDOMListeners(): void {
    Object.values(EventType).forEach((event) => {
        document.addEventListener(event, handleEvent, {
            capture: true,
            passive: true
        });
    });
}

/**
 * Removes event listeners from the DOM.
 */
function removeDOMListeners(): void {
    Object.values(EventType).forEach((event) => {
        document.removeEventListener(event, handleEvent, { capture: true });
    });
}

/**
 * Initializes the event recorder.
 */
function initialize(): void {
    port = chrome.runtime.connect({ name: window.location.hostname });
    port.onDisconnect.addListener(removeDOMListeners);
    addDOMListeners();
}

initialize();

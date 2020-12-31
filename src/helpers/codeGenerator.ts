/**
 * Generates the Cypress code that will simulate the recorded user session.
 *
 * Each time the user records, this function will generate a cy.visit command that will
 * store the current url, as well each subsequest user interaction with the browser.
 */
import type { ParsedEvent } from "../types";
import { EventType } from "../constants";

// TODO: may need .filter( ":visible" ) in the case of something like the right-click menu being rendered but not visible
const selection = (event: ParsedEvent) =>
    ({
        [true as any]: `get('${event.selector}')`,
        [event.shouldUseContains as any]: `contains('${event.innerText}')`,
        [event.shouldUseGetContains as any]: `get(':contains("${event.innerText}"):visible')`
    }[true as any]);

// event.innerText
//     ? `contains('${event.innerText}')`
//     : `get('${event.selector}')`;

/**
 * Helper functions that handle each action type.
 * @param event
 */

function handleClick(event: ParsedEvent): string {
    return `cy.${selection(event)}.click();`;
}

function handleKeydown(event: ParsedEvent): string | null {
    const typeKey = {
        Backspace: "{backspace}",
        Escape: "{esc}",
        ArrowUp: "{uparrow}",
        ArrowRight: "{rightarrow}",
        ArrowDown: "{downarrow}",
        ArrowLeft: "{leftarrow}"
    };

    return event.key in typeKey
        ? `cy.${selection(event)}.type(${typeKey[event.key]})`
        : null;
}

function handleChange(event: ParsedEvent): string {
    if (event.inputType === "checkbox" || event.inputType === "radio")
        return null;
    return `cy.${selection(event)}.type('${event.value.replace(
        /'/g,
        "\\'"
    )}');`;
}

function handleDoubleclick(event: ParsedEvent): string {
    return `cy.${selection(event)}.dblclick();`;
}

function handleSubmit(event: ParsedEvent): string {
    return `cy.${selection(event)}.submit();`;
}

function handleUrl(url: string): string {
    const { origin, pathname } = new URL(url);
    return `cy.url().should('contains', '${origin + pathname}');`;
}

export default {
    createBlock: (event: ParsedEvent): string => {
        switch (event.action) {
            case EventType.CLICK:
                return handleClick(event);
            case EventType.KEYDOWN:
                return handleKeydown(event);
            case EventType.CHANGE:
                return handleChange(event);
            case EventType.DBLCLICK:
                return handleDoubleclick(event);
            case EventType.SUBMIT:
                return handleSubmit(event);
            default:
                throw new Error(`Unhandled event: ${event.action}`);
        }
    },
    createVisit: (url: string): string => `cy.visit('${url}');`,
    createUrl: (url: string): string => handleUrl(url)
};

// What this browser has done, kept only in the browser: the games it played and the events it sent.
const PLAYS = "date-a-globe:plays";
const SENT = "date-a-globe:sent";

function read(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
function add(key: string, id: string) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify([id, ...read(key).filter((v) => v !== id)].slice(0, 50)),
    );
  } catch {
    // Private browsing can refuse storage; the game still works without it.
  }
}

export const rememberPlay = (id: string) => add(PLAYS, id);
export const isMyPlay = (id: string) => read(PLAYS).includes(id);
export const rememberSent = (id: string) => add(SENT, id);
export const sentEvents = () => read(SENT);

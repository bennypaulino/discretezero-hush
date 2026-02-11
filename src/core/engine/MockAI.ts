// This pretends to be the Llama engine so we can build the UI
export const generateResponse = async (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`[MOCK AI] You said: "${prompt}".\n\nI am Discrete Zero. I am currently running in UI-Only mode because we are testing the interface.`);
    }, 1000); // Fakes a 1-second thinking time
  });
};

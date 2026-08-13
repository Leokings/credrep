import { CredenceApp } from "../components/credence-app";
import { createPreviewState } from "../lib/product-data";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const initialState = createPreviewState(
    user
      ? {
          userId: user.userId,
          displayName: user.displayName,
          email: user.email,
        }
      : null,
  );

  return (
    <CredenceApp
      initialState={initialState}
      signedIn={Boolean(user)}
      signInPath={chatGPTSignInPath("/")}
    />
  );
}

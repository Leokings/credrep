import { CredenceApp } from "../components/credence-app";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <CredenceApp
      viewer={user ? { userId: user.userId, displayName: user.displayName, email: user.email } : null}
      signedIn={Boolean(user)}
      signInPath={chatGPTSignInPath("/")}
    />
  );
}

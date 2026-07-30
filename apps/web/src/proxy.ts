import { clerkMiddleware } from "@clerk/nextjs/server";

const allowedParties = process.env.ALLOWED_PARTIES
  ? process.env.ALLOWED_PARTIES.split(",").map((p) => p.trim()).filter(Boolean)
  : undefined;

export default clerkMiddleware({
  authorizedParties: allowedParties,
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

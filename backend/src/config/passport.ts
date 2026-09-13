import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import prisma from "../db/prisma.js";

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from "./env.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        const email =
          profile.emails?.[0]?.value;

        if (!email) {
          return done(
            new Error(
              "Google account has no email"
            )
          );
        }

        const name =
          profile.displayName || email;

        const avatar =
          profile.photos?.[0]?.value || null;

        const user =
          await prisma.user.upsert({
            where: {
              googleId: profile.id,
            },
            update: {
              name,
              email,
              avatar,
            },
            create: {
              googleId: profile.id,
              name,
              email,
              avatar,
            },
          });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;
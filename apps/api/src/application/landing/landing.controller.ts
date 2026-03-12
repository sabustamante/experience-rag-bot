import { Controller, Get, Param, Query } from "@nestjs/common";

import type { Language, ProfileType } from "@repo/shared-types";

import { LandingService } from "../../domain/services/landing.service";

@Controller("api/landing")
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  /**
   * GET /api/landing/:profile?lang=en|es
   * Returns AI-generated landing content tailored to the given profile and language.
   */
  @Get(":profile")
  getProfile(@Param("profile") profile: ProfileType, @Query("lang") lang: Language = "en") {
    return this.landingService.getProfileContent(profile, lang);
  }
}

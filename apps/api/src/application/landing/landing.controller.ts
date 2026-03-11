import { Controller, Get, Param } from "@nestjs/common";

import type { ProfileType } from "@repo/shared-types";

import { LandingService } from "../../domain/services/landing.service";

@Controller("api/landing")
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  /**
   * GET /api/landing/:profile
   * Returns AI-generated landing content tailored to the given profile.
   */
  @Get(":profile")
  getProfile(@Param("profile") profile: ProfileType) {
    return this.landingService.getProfileContent(profile);
  }
}

"use client";
import React from "react";
import { createContextualCan } from "@casl/react";
import { AbilityContext } from "./AbilityProvider";
import type { AppAbility } from "../lib/ability";  // ✅

export const Can = createContextualCan<AppAbility>(AbilityContext.Consumer as React.Consumer<AppAbility>);
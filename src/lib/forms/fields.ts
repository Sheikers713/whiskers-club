import type { ApplicationType } from "@prisma/client";
import type { Dictionary } from "../i18n/dictionary";

export type FieldDef = { name: string; label: (d: Dictionary) => string; multiline?: boolean; required?: boolean };

/** Extra questions per form, stored in Application.answers. */
export const extraFields: Record<ApplicationType, FieldDef[]> = {
  ADOPTION: [
    { name: "household", label: (d) => d.forms.household, required: true },
    { name: "kids", label: (d) => d.forms.hasKids, required: true },
    { name: "pets", label: (d) => d.forms.hasPets, required: true },
    { name: "housing", label: (d) => d.forms.housing, multiline: true, required: true },
    { name: "experience", label: (d) => d.forms.experience, multiline: true, required: true },
    { name: "indoorOnly", label: (d) => d.forms.indoorOnly, required: true },
    { name: "aboutHome", label: (d) => d.forms.aboutHome, multiline: true },
  ],
  VOLUNTEER: [
    { name: "how", label: (d) => d.forms.volunteerHow, multiline: true, required: true },
    { name: "availability", label: (d) => d.forms.availability },
  ],
  FOSTER: [
    { name: "conditions", label: (d) => d.forms.fosterConditions, multiline: true, required: true },
    { name: "duration", label: (d) => d.forms.fosterDuration, required: true },
    { name: "pets", label: (d) => d.forms.hasPets },
  ],
  PARTNERSHIP: [
    { name: "organization", label: (d) => d.forms.organization, required: true },
    { name: "offer", label: (d) => d.forms.partnerOffer, multiline: true, required: true },
  ],
};

export const contactMethods = ["telegram", "whatsapp", "viber", "phone", "email", "instagram"] as const;

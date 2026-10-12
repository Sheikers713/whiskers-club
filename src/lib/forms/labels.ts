import type { ApplicationType } from "@prisma/client";
import type { Dictionary } from "../i18n/dictionary";
import type { FormLabels } from "@/components/site/ApplicationForm";
import { extraFields } from "./fields";

export function formLabels(d: Dictionary): FormLabels {
  return {
    name: d.forms.name,
    contactMethod: d.forms.contactMethod,
    contact: d.forms.contact,
    city: d.forms.city,
    consent: d.forms.consent,
    privacyLink: d.forms.privacyLink,
    required: d.forms.required,
    submit: d.forms.submit,
    sending: d.forms.sending,
    thanksTitle: d.forms.thanksTitle,
    thanksText: d.forms.thanksText,
    error: d.forms.error,
    tooMany: d.forms.tooMany,
    messengers: d.forms.messenger,
  };
}

export function formFields(type: ApplicationType, d: Dictionary) {
  return extraFields[type].map((f) => ({ name: f.name, label: f.label(d), multiline: f.multiline, required: f.required }));
}

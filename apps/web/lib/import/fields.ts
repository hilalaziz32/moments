/** The fields an HR roster can map onto. Order drives the mapping UI. */
export interface FieldSpec {
  key: string;
  label: string;
  kind: "text" | "email" | "phone" | "date" | "enum";
  required?: boolean;
  /** Lower-cased header fragments we accept as a match. */
  aliases: string[];
  hint?: string;
}

export const IMPORT_FIELDS: FieldSpec[] = [
  { key: "fullName", label: "Full name", kind: "text", required: true,
    aliases: ["name", "full name", "employee name", "fullname", "staff name"] },
  { key: "workEmail", label: "Work email", kind: "email",
    aliases: ["email", "work email", "official email", "company email", "e-mail"],
    hint: "Used to match people on re-import, and to reach them." },
  { key: "dateOfBirth", label: "Date of birth", kind: "date",
    aliases: ["dob", "birth", "birthday", "date of birth", "birth date"],
    hint: "Drives birthday moments." },
  { key: "hireDate", label: "Joining date", kind: "date",
    aliases: ["hire", "joining", "joined", "doj", "start date", "date of joining", "hire date"],
    hint: "Drives work anniversaries." },
  { key: "department", label: "Department", kind: "text",
    aliases: ["department", "dept", "team", "division", "function"] },
  { key: "jobTitle", label: "Job title", kind: "text",
    aliases: ["title", "designation", "role", "position", "job title"] },
  { key: "managerEmail", label: "Manager's email", kind: "email",
    aliases: ["manager", "manager email", "reports to", "supervisor", "line manager"],
    hint: "So their manager gets a pre-written note." },
  { key: "phoneE164", label: "Phone", kind: "phone",
    aliases: ["phone", "mobile", "cell", "contact", "number", "msisdn"] },
  { key: "whatsappE164", label: "WhatsApp number", kind: "phone",
    aliases: ["whatsapp", "whats app", "wa number"] },
  { key: "personalEmail", label: "Personal email", kind: "email",
    aliases: ["personal email", "private email", "alternate email"] },
  { key: "employeeCode", label: "Employee ID", kind: "text",
    aliases: ["employee id", "emp id", "code", "staff id", "employee code", "emp code"] },
  { key: "gender", label: "Gender", kind: "enum",
    aliases: ["gender", "sex"] },
  { key: "city", label: "City", kind: "text",
    aliases: ["city", "location", "office", "branch", "station"] },
  { key: "shirtSize", label: "Shirt size", kind: "enum",
    aliases: ["size", "shirt", "t-shirt", "tshirt size", "shirt size"] },
  { key: "preferredName", label: "Preferred name", kind: "text",
    aliases: ["preferred", "nickname", "known as", "calls"] },
  { key: "fullNameUr", label: "Name in Urdu", kind: "text",
    aliases: ["urdu", "urdu name", "name urdu"] },
];

export const FIELD_BY_KEY = new Map(IMPORT_FIELDS.map((f) => [f.key, f]));

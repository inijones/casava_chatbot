# Public page extracts reviewed on 22 October 2026

These notes are the ingestion audit trail. They are not embedded.
Only `knowledge/reviewed/chunks.json` is loaded into PostgreSQL.

Retrieval method: the Business Gro page is a JavaScript application, so its
visible text and FAQ answers were read in a browser after the page rendered.
Terms, privacy, claims, make-a-claim, and the two help-centre articles were
read from the fetched page text and checked against the same URLs.

## https://casava.com/business-gro

Title: Casava. Reviewed 2026-10-22.

Headline: Grow your business with Business gro.
Subcopy: Enjoy easy access to business loans, business insurance and free trainings.

About: With Business Gro, you have access to capacity building and relevant
training that allows you to enjoy basic business continuity and financial
protection whenever you encounter natural or unexpected events.

Benefits listed:

- Get Insurance and access to loans from providers
- Trainings and educational content by professionals
- Scale your businesses by getting the right tools for faster growth
- Get business support from the government

FAQ answers present in the page DOM:

- Who is business gro for: Small medium entrepreneurs with registered businesses on the SMEDAN platform are eligible to apply for Business Gro.
- How do I buy business gro?: To get Business Gro, you need to be a registered member of SMEDAN. Once you've completed your registration, Business Gro will be seamlessly integrated into your dashboard, adding significant value to your membership. With just a small monthly fee of N200, you enjoy full access.
- What does the insurance coverage of business gro afford customers?: Business Gro offers small businesses access to a range of essential services, including Business Insurance, Educational Training, and Business Loans.
- Who is eligible to apply for Business Gro?: Small medium entrepreneurs with registered businesses on the SMEDAN platform are eligible to apply for Business Gro.
- How do I make a claim?: In order to initiate a claim, please notify us by sending an email to info@smedanregister.ng. Attach relevant documents, including photographic evidence of the incident and a breakdown of the cost of the items. Our claims process will begin promptly upon receipt.
- Can I change my hospital at any time: Simply login to your Casava account and click on the " File Claim" button then follow the instructions. You can be sure of a response within 24 hours. Alternatively, you can visit claims.casava.co and follow the process highlighted.
- How can I know what my policy does not cover?: You can know the exclusions of your policy by carefully reviewing your policy document. After making your first premium payment, you will receive a comprehensive policy document providing detailed information about your coverage.

Review note: the hospital question's published answer does not mention hospitals.
It was stored verbatim and must not be treated as hospital cover.

Footer marketing on the same page: Sign up in 90 seconds with an affordable
monthly subscription, starting at N600. This is not the Business Gro FAQ price.

Footer licence: Casava Inc. is a Delaware, USA registered LLC Corporation.
Casava Microinsurance Limited (CML) is registered in the Federal Republic of
Nigeria and licensed by National Insurance Commission (NAICOM) to provide life
and general microinsurance underwriting services.

Contact: hello@casava.com, +234 201 330 9618, WhatsApp +234 702 500 4444,
17 Olosa Street, V.I, Lagos.

Not on this page: policy wording, sum insured, exclusion list, or a statement
that every claim pays a fixed amount.

## https://casava1.zohodesk.com/portal/en/kb/articles/what-is-business-gro

Help-centre article. Monthly payment of 200 Naira includes Business Insurance
(Fire and Flood), training, and loans. Payment can be monthly, quarterly, or
annually. Register on SMEDAN and activate benefits. Enquiries: hello@casava.co.

Review note: "Fire and Flood" is the article's package description, not a
claim decision and not the policy schedule.

## https://casava1.zohodesk.com/portal/en/kb/articles/how-do-i-pay-for-business-gro

USSD *6555# on MTN, then 2 SMS messages. Web payment after SMEDAN registration,
via "SMEDAN" benefits, by card or transfer. Monthly, quarterly, or annually.
The closing contact sentence on the page is garbled and visibly includes both
hello@casava.co and info@smedanregister.ng.

## https://casava.com/claims

Marketing: pay claims in 48 hours or less; Haruna responds in minutes.
HealthCash FAQs on the same page (cash back for minor injuries and/or permanent
disability; government ID to sign up; claims limited to the total amount
entitled; HealthCash covers only the policyholder; file within 72 hours;
File Claim in the account or claims.casava.co, response within 24 hours).

Review note: HealthCash rules were stored under category `healthcash` so they
are not applied to Business Gro by default.

## https://casava.com/make-a-claim

"Fill in the form below to register a claim with Casava. Our team will get
back to you as soon as possible." Same public contact details as the footer.
No document checklist on the extracted page.

## https://casava.com/terms

Website terms for Casava Microinsurance Limited. Products named: health
insurance, health cash, Businessgro, and credit life. Refund, account closure,
chargeback, and health reimbursement rules were summarized into two reviewed
chunks. They are not the Business Gro policy wording.

## https://casava.com/privacy-policy

Privacy policy for Casava Microinsurance Limited under the Nigeria Data
Protection Act 2023. Collection categories, rights, 72-hour NDPC breach
notice, international transfers, and hello@casava.com were summarized into
two reviewed chunks. The policy mentions live chat and chatbots as Casava
collection channels. This prototype is not that official chatbot.

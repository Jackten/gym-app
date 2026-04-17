export const WAIVER_VERSION = '2026-04-15-pr-v2';

export const WAIVER_SECTIONS = [
  {
    heading: 'Voluntary participation in a recreational fitness program',
    body:
      'I understand that Pelayo Wellness offers voluntary fitness and wellness sessions. I am choosing to participate freely and I understand that I may decline or stop participation at any time if I believe an activity is unsafe for me.',
  },
  {
    heading: 'Known and inherent risks',
    body:
      'I understand that exercise, mobility work, strength training, conditioning, recovery activities, and use of gym equipment involve inherent risks, including muscle soreness, strains, sprains, falls, aggravation of a prior condition, equipment-related injury, illness, disability, or, in rare cases, death. I understand that not every risk can be eliminated without changing the nature of the activity.',
  },
  {
    heading: 'Health disclosure and personal responsibility',
    body:
      'I agree to use reasonable care for my own safety, to follow staff instructions, to stop if I feel pain, dizziness, or distress, and to inform Pelayo Wellness about injuries, medical conditions, pregnancy, medications, or other limits that could affect safe participation. I understand that Pelayo Wellness is not providing medical diagnosis or medical treatment through this form.',
  },
  {
    heading: 'Release of claims to the extent permitted by Puerto Rico law',
    body:
      'To the fullest extent permitted by the laws of Puerto Rico, I assume the ordinary risks of participation and release Pelayo Wellness, its owners, coaches, staff, and contractors from claims for personal injury, property damage, or other loss arising from ordinary negligence connected to my voluntary participation. This release does not apply to claims based on gross negligence, reckless conduct, intentional misconduct, or any right that cannot legally be waived.',
  },
  {
    heading: 'Emergency response authorization',
    body:
      'If staff reasonably believe I need urgent assistance during an in-person session, I authorize Pelayo Wellness to seek emergency help and to contact the emergency contact listed below. I understand that I remain financially responsible for my own medical care and transport.',
  },
  {
    heading: 'Electronic signature and acknowledgment',
    body:
      'By signing electronically, I confirm that I read this waiver carefully, understood its legal effect, had the opportunity to ask questions, and intend my typed signature to have the same effect as a written signature.',
  },
];

export function emptyWaiverForm(currentUser) {
  return {
    legalName: currentUser?.name || '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    signatureName: currentUser?.name || '',
    agreed: false,
  };
}

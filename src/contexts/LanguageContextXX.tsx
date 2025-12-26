import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'he' | 'en';
type Currency = 'USD' | 'ILS';

interface Translation {
  he: string;
  en: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  currencySymbol: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Translation> = {
  "app.title": { "he": "Synago", "en": "Synago" },
  "auth.signIn": { "he": "כניסה", "en": "Sign in" },
  "auth.phoneTab": { "he": "טלפון", "en": "Phone" },
  "auth.emailTab": { "he": "אימייל", "en": "Email" },
  "auth.phonePlaceholder": { "he": "הקלד מספר טלפון", "en": "Enter phone number" },
  "auth.emailPlaceholder": { "he": "הקלד אימייל", "en": "Enter email" },
  "auth.sendCode": { "he": "שלח קוד", "en": "Send Magic Link" },
  "auth.resendCode": { "he": "שלח שוב", "en": "Try different email" },
  "auth.enterCode": { "he": "הזן קוד בן 6 ספרות", "en": "Enter 6-digit code" },
  "auth.verify": { "he": "אימות", "en": "Verify" },
  "auth.rateLimited": { "he": "ניסית יותר מדי פעמים. נסה שוב בעוד שעה.", "en": "Too many attempts. Please try again in one hour." },
  "auth.checkEmail": { "he": "בדקו את האימייל שלכם!", "en": "Check your email!" },
  "auth.magicLinkSent": { "he": "שלחנו קישור כניסה ל", "en": "We've sent a magic link to" },
  "auth.clickLink": { "he": "לחצו על הקישור באימייל כדי להיכנס.", "en": "Click the link in the email to sign in." },
  
  "dashboard.title": { "he": "לוח בקרה", "en": "Dashboard" },
  "dashboard.subtitle": { "he": "סקירה של פעילות התרומות", "en": "Overview of your donation activities" },
  "dashboard.totalGross": { "he": "סך הכל ברוטו", "en": "Total Gross" },
  "dashboard.totalNet": { "he": "סך הכל נטו", "en": "Total Net" },
  "dashboard.donations": { "he": "תרומות", "en": "Donations" },
  "dashboard.receiptRate": { "he": "אחוז קבלות", "en": "Receipt Rate" },
  "dashboard.thisMonth": { "he": "החודש", "en": "This month" },
  "dashboard.afterFees": { "he": "אחרי עמלות", "en": "After fees" },
  "dashboard.average": { "he": "ממוצע", "en": "Avg" },
  "dashboard.receiptsSent": { "he": "קבלות נשלחו", "en": "Receipts sent" },
  "dashboard.todaysDonations": { "he": "תרומות היום", "en": "Today's Donations" },
  "dashboard.recentActivity": { "he": "פעילות אחרונה מהיום", "en": "Recent donation activity from today" },
  
  "donors.title": { "he": "תורמים", "en": "Donors" },
  "donors.subtitle": { "he": "ניהול מאגר התורמים", "en": "Manage your donor database" },
  "donors.add": { "he": "הוסף תורם", "en": "Add Donor" },
  "donors.edit": { "he": "ערוך תורם", "en": "Edit Donor" },
  "donors.delete": { "he": "מחק תורם", "en": "Delete Donor" },
  "donors.phone": { "he": "טלפון", "en": "Phone" },
  "donors.email": { "he": "אימייל", "en": "Email" },
  "donors.firstName": { "he": "שם פרטי", "en": "First Name" },
  "donors.lastName": { "he": "שם משפחה", "en": "Last Name" },
  "donors.displayName": { "he": "שם תצוגה", "en": "Display Name" },
  "donors.city": { "he": "עיר", "en": "City" },
  "donors.notes": { "he": "הערות", "en": "Notes" },
  "donors.save": { "he": "שמור", "en": "Save" },
  "donors.cancel": { "he": "ביטול", "en": "Cancel" },
  "donors.profile": { "he": "פרופיל תורם", "en": "Donor Profile" },
  "donors.addDonation": { "he": "הוסף תרומה", "en": "Add Donation" },
  "donors.totalDonated": { "he": "סך כל תרומות", "en": "Total Donated" },
  "donors.totalDonations": { "he": "מספר תרומות", "en": "Total Donations" },
  "donors.averageDonation": { "he": "תרומה ממוצעת", "en": "Average Donation" },
  "donors.donationHistory": { "he": "היסטוריית תרומות", "en": "Donation History" },
  "donors.noDonations": { "he": "אין תרומות עדיין", "en": "No donations yet" },
  "donors.deleteConfirm": { "he": "האם אתה בטוח שברצונך למחוק תורם זה?", "en": "Are you sure you want to delete this donor?" },
  "donors.deleted": { "he": "תורם נמחק בהצלחה", "en": "Donor deleted successfully" },
  "donors.created": { "he": "תורם נוצר בהצלחה", "en": "Donor created successfully" },
  "donors.updated": { "he": "תורם עודכן בהצלחה", "en": "Donor updated successfully" },
  "donors.saveFailed": { "he": "שמירת תורם נכשלה", "en": "Failed to save donor" },
  
  "donations.addSuccess": { "he": "תרומה נוספה בהצלחה", "en": "Donation added successfully" },
  "donations.updateSuccess": { "he": "תרומה עודכנה בהצלחה", "en": "Donation updated successfully" },
  "donations.deleteSuccess": { "he": "תרומה נמחקה בהצלחה", "en": "Donation deleted successfully" },
  "donations.addFailed": { "he": "הוספת תרומה נכשלה", "en": "Failed to add donation" },
  "donations.updateFailed": { "he": "עדכון תרומה נכשל", "en": "Failed to update donation" },
  "donations.deleteFailed": { "he": "מחיקת תרומה נכשלה", "en": "Failed to delete donation" },
  "donations.deleteConfirm": { "he": "האם אתה בטוח שברצונך למחוק תרומה זו", "en": "Are you sure you want to delete this" },
  "donations.donation": { "he": "תרומה", "en": "donation" },
  "donations.amount": { "he": "סכום", "en": "Amount" },
  "donations.type": { "he": "סוג", "en": "Type" },
  "donations.paymentMethod": { "he": "אמצעי תשלום", "en": "Payment Method" },
  "donations.designation": { "he": "ייעוד", "en": "Designation" },
  "donations.status": { "he": "סטטוס", "en": "Status" },
  "donations.date": { "he": "תאריך", "en": "Date" },
  "donations.receiptNumber": { "he": "מספר קבלה", "en": "Receipt #" },
  
  "donations.types.Regular": { "he": "רגיל", "en": "Regular" },
  "donations.types.Nedarim": { "he": "נדרים", "en": "Nedarim" },
  "donations.types.Aliyot": { "he": "עליות", "en": "Aliyot" },
  "donations.types.Yahrzeit": { "he": "יאהרצייט", "en": "Yahrzeit" },
  "donations.types.Other": { "he": "אחר", "en": "Other" },
  
  "donations.payment.Cash": { "he": "מזומן", "en": "Cash" },
  "donations.payment.Check": { "he": "צ'ק", "en": "Check" },
  "donations.payment.Transfer": { "he": "העברה", "en": "Transfer" },
  "donations.payment.CreditCard": { "he": "כרטיס אשראי", "en": "Credit Card" },
  "donations.payment.Zelle": { "he": "Zelle", "en": "Zelle" },
  "donations.payment.Other": { "he": "אחר", "en": "Other" },
  
  "donations.status.Pending": { "he": "ממתין", "en": "Pending" },
  "donations.status.Succeeded": { "he": "הצליח", "en": "Succeeded" },
  "donations.status.Failed": { "he": "נכשל", "en": "Failed" },
  "donations.status.Refunded": { "he": "הוחזר", "en": "Refunded" },
  "donations.status.Disputed": { "he": "במחלוקת", "en": "Disputed" },
  
  "donations.fee": { "he": "עמלה", "en": "Fee" },
  "donations.net": { "he": "נטו", "en": "Net" },
  
  "donations.title": { "he": "דוח תרומות", "en": "Donations Report" },
  "donations.subtitle": { "he": "מעקב וייצוא רשומות תרומות", "en": "Track and export your donation records" },
  "donations.startDate": { "he": "תאריך התחלה", "en": "Start Date" },
  "donations.endDate": { "he": "תאריך סיום", "en": "End Date" },
  "donations.exportCSV": { "he": "ייצא CSV", "en": "Export CSV" },
  "donations.exportExcel": { "he": "ייצא Excel", "en": "Export Excel" },
  "donations.totalAmount": { "he": "סכום כולל", "en": "Total Amount" },
  "donations.totalFees": { "he": "סך עמלות", "en": "Total Fees" },
  "donations.netAmount": { "he": "סכום נטו", "en": "Net Amount" },
  "donations.count": { "he": "תרומות", "en": "Donations" },
  
  "pledges.title": { "he": "התחייבויות", "en": "Pledges" },
  "pledges.subtitle": { "he": "מעקב אחר התחייבויות ותשלומים של תורמים", "en": "Track donor pledge commitments and payments" },
  "pledges.create": { "he": "צור התחייבות", "en": "Create Pledge" },
  "pledges.totalAmount": { "he": "סכום כולל", "en": "Total Amount" },
  "pledges.amountPaid": { "he": "סכום ששולם", "en": "Amount Paid" },
  "pledges.balanceOwed": { "he": "יתרה לתשלום", "en": "Balance Owed" },
  "pledges.progress": { "he": "התקדמות", "en": "Progress" },
  "pledges.frequency": { "he": "תדירות", "en": "Frequency" },
  "pledges.status": { "he": "סטטוס", "en": "Status" },
  "pledges.startDate": { "he": "תאריך התחלה", "en": "Start Date" },
  "pledges.completionDate": { "he": "תאריך סיום צפוי", "en": "Expected Completion" },
  "pledges.sendReminders": { "he": "שלח תזכורות", "en": "Send Reminders" },
  "pledges.active": { "he": "פעיל", "en": "Active" },
  "pledges.completed": { "he": "הושלם", "en": "Completed" },
  "pledges.cancelled": { "he": "בוטל", "en": "Cancelled" },
  "pledges.weekly": { "he": "שבועי", "en": "Weekly" },
  "pledges.monthly": { "he": "חודשי", "en": "Monthly" },
  "pledges.quarterly": { "he": "רבעוני", "en": "Quarterly" },
  "pledges.yearly": { "he": "שנתי", "en": "Yearly" },
  "pledges.oneTime": { "he": "חד פעמי", "en": "One-time" },
  
  "settings.title": { "he": "הגדרות", "en": "Settings" },
  "settings.subtitle": { "he": "הגדרות העדפות האפליקציה", "en": "Configure your application preferences" },
  "settings.general": { "he": "כללי", "en": "General" },
  "settings.receipts": { "he": "קבלות", "en": "Receipts" },
  "settings.payment": { "he": "תשלום", "en": "Payment" },
  "settings.zelle": { "he": "Zelle", "en": "Zelle" },
  "settings.currency": { "he": "מטבע ברירת מחדל", "en": "Default Currency" },
  "settings.receiptFormat": { "he": "פורמט קבלה", "en": "Receipt Format" },
  "settings.surcharge": { "he": "אפשר עמלה", "en": "Enable Surcharge" },
  "settings.surchargePercent": { "he": "אחוז עמלה (%)", "en": "Surcharge Percent (%)" },
  "settings.surchargeFixed": { "he": "עמלה קבועה", "en": "Fixed Surcharge" },
  "settings.save": { "he": "שמור הגדרות", "en": "Save Settings" },
  "settings.saving": { "he": "שומר...", "en": "Saving..." },
  "settings.saveSuccess": { "he": "הגדרות נשמרו בהצלחה", "en": "Settings saved successfully" },
  "settings.saveFailed": { "he": "שמירת הגדרות נכשלה", "en": "Failed to save settings" },
  
  "import.title": { "he": "ייבוא נתונים", "en": "Data Import" },
  "import.subtitle": { "he": "ייבוא תורמים ותרומות מגיליונות אלקטרוניים", "en": "Import donors and donations from spreadsheets" },
  "import.tab.donors": { "he": "ייבוא תורמים", "en": "Import Donors" },
  "import.tab.donations": { "he": "ייבוא תרומות (אופציונלי)", "en": "Import Donations (Optional)" },
  "import.step.upload": { "he": "העלאה", "en": "Upload" },
  "import.step.mapping": { "he": "מיפוי", "en": "Mapping" },
  "import.step.validate": { "he": "אימות", "en": "Validation" },
  "import.step.summary": { "he": "תקציר", "en": "Summary" },
  "import.step.import": { "he": "ייבוא", "en": "Import" },
  "import.templates": { "he": "הורדת תבניות", "en": "Download templates" },
  "import.required": { "he": "שדה חובה", "en": "Required" },
  "import.unmapped": { "he": "לא ממופה", "en": "Unmapped" },
  "import.toAdd": { "he": "ייווספו", "en": "To Add" },
  "import.toMerge": { "he": "ימוזגו", "en": "To Merge" },
  "import.toSkip": { "he": "יידחו", "en": "To Skip" },
  "import.run": { "he": "בצע ייבוא", "en": "Run Import" },
  "import.done": { "he": "ייבוא הושלם", "en": "Import completed" },
  "import.downloadResult": { "he": "הורד דו\"ח תוצאות", "en": "Download result log" },
  "import.parseFailed": { "he": "ניתוח קובץ נכשל", "en": "Failed to parse file" },
  "import.validationFailed": { "he": "אימות נכשל", "en": "Validation failed" },
  "import.simulationFailed": { "he": "סימולציה נכשלה", "en": "Simulation failed" },
  "import.importFailed": { "he": "ייבוא נכשל", "en": "Import failed" },
  "import.warnings": { "he": "אזהרות", "en": "warnings" },
  "import.parsedWith": { "he": "נותח עם", "en": "Parsed with" },
  
  "sidebar.dashboard": { "he": "לוח בקרה", "en": "Dashboard" },
  "sidebar.donors": { "he": "תורמים", "en": "Donors" },
  "sidebar.donations": { "he": "תרומות", "en": "Donations" },
  "sidebar.pledges": { "he": "התחייבויות", "en": "Pledges" },
  "sidebar.campaigns": { "he": "קמפיינים", "en": "Campaigns" },
  "sidebar.import": { "he": "ייבוא", "en": "Import" },
  "sidebar.settings": { "he": "הגדרות", "en": "Settings" },
  "sidebar.signOut": { "he": "יציאה", "en": "Sign Out" },
  
  "common.loading": { "he": "טוען...", "en": "Loading..." },
  "common.save": { "he": "שמור", "en": "Save" },
  "common.cancel": { "he": "ביטול", "en": "Cancel" },
  "common.delete": { "he": "מחק", "en": "Delete" },
  "common.edit": { "he": "ערוך", "en": "Edit" },
  "common.search": { "he": "חיפוש", "en": "Search" },
  "common.actions": { "he": "פעולות", "en": "Actions" },
  
  "errors.phoneInvalid": { "he": "מספר הטלפון שהוזן אינו תקין", "en": "The phone number format is invalid." },
  "errors.amountInvalid": { "he": "סכום אינו תקין", "en": "Invalid amount" },
  "errors.dateInvalid": { "he": "תאריך אינו תקין", "en": "Invalid date" },
  "error.phoneInvalid": { "he": "מספר הטלפון שהוזן אינו תקין", "en": "The phone number format is invalid." },
  
  "register.title": { "he": "רישום בית כנסת", "en": "Register Your Synagogue" },
  "register.subtitle": { "he": "הצטרף לפלטפורמה שלנו והתחל לנהל תרומות", "en": "Join our platform and start managing your donations" },
  "register.backToLogin": { "he": "חזרה להתחברות", "en": "Back to Login" },
  "register.orgInfo": { "he": "מידע על הארגון", "en": "Organization Information" },
  "register.orgName": { "he": "שם הארגון", "en": "Organization Name" },
  "register.contactName": { "he": "שם איש קשר", "en": "Contact Name" },
  "register.contactEmail": { "he": "אימייל איש קשר", "en": "Contact Email" },
  "register.contactPhone": { "he": "טלפון איש קשר", "en": "Contact Phone" },
  "register.city": { "he": "עיר", "en": "City" },
  "register.state": { "he": "מדינה/מחוז", "en": "State" },
  "register.memberCount": { "he": "מספר חברים משוער", "en": "Estimated Member Count" },
  "register.memberCountHelp": { "he": "זה עוזר לנו להקצות את רמת המנוי המתאימה לארגון שלך", "en": "This helps us assign the appropriate subscription tier for your organization" },
  "register.adminAccount": { "he": "חשבון מנהל", "en": "Admin Account" },
  "register.adminEmail": { "he": "אימייל מנהל", "en": "Admin Email" },
  "register.adminPassword": { "he": "סיסמת מנהל", "en": "Admin Password" },
  "register.passwordHelp": { "he": "חייב להיות לפחות 6 תווים", "en": "Must be at least 6 characters" },
  "register.creating": { "he": "יוצר חשבון...", "en": "Creating Account..." },
  "register.submit": { "he": "רישום ארגון", "en": "Register Organization" },
  "register.success": { "he": "ההרשמה הצליחה! אנא בדוק את האימייל שלך לאימות החשבון.", "en": "Registration successful! Please check your email to verify your account." },
  "register.failed": { "he": "ההרשמה נכשלה. אנא נסה שוב.", "en": "Registration failed. Please try again." },
  
  "yahrzeits.title": { "he": "יאהרצייט", "en": "Yahrzeits" },
  "yahrzeits.subtitle": { "he": "ניהול תאריכי הזיכרון ותזכורות", "en": "Manage memorial dates and reminders" },
  "yahrzeits.add": { "he": "הוסף יאהרצייט", "en": "Add Yahrzeit" },
  "yahrzeits.import": { "he": "ייבוא", "en": "Import" },
  "yahrzeits.preview": { "he": "תצוגה מקדימה", "en": "Preview" },
  "yahrzeits.print": { "he": "הדפס", "en": "Print" },
  "yahrzeits.clear": { "he": "נקה", "en": "Clear" },
  "yahrzeits.selectAll": { "he": "בחר הכל", "en": "Select All" },
  "yahrzeits.selected": { "he": "נבחרו", "en": "selected" },
  "yahrzeits.noYahrzeits": { "he": "אין יאהרצייט", "en": "No Yahrzeits" },
  "yahrzeits.noYahrzeitsDesc": { "he": "הוסף רשומות יאהרצייט כדי להתחיל לעקוב אחר תאריכי הזיכרון", "en": "Add yahrzeit records to start tracking memorial dates" },
  "yahrzeits.importYahrzeits": { "he": "ייבוא יאהרצייט", "en": "Import Yahrzeits" },
  "yahrzeits.donor": { "he": "תורם", "en": "Donor" },
  "yahrzeits.deceasedName": { "he": "שם הנפטר", "en": "Deceased Name" },
  "yahrzeits.hebrewDate": { "he": "תאריך עברי", "en": "Hebrew Date" },
  "yahrzeits.secularDate": { "he": "תאריך לועזי", "en": "Secular Date" },
  "yahrzeits.relationship": { "he": "קרבה", "en": "Relationship" },
  "yahrzeits.reminder": { "he": "תזכורת", "en": "Reminder" },
  "yahrzeits.enabled": { "he": "מופעל", "en": "Enabled" },
  "yahrzeits.disabled": { "he": "מושבת", "en": "Disabled" },
  "yahrzeits.delete": { "he": "מחק יאהרצייט", "en": "Delete Yahrzeit" },
  "yahrzeits.deleteConfirm": { "he": "האם אתה בטוח שברצונך למחוק רשומת יאהרצייט זו? פעולה זו לא ניתנת לביטול.", "en": "Are you sure you want to delete this yahrzeit record? This action cannot be undone." }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('language') as Language | null;
      return saved === 'he' || saved === 'en' ? saved : 'he';
    } catch {
      return 'he';
    }
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('currency') as Currency | null;
      return saved === 'USD' || saved === 'ILS' ? saved : 'USD';
    } catch {
      return 'USD';
    }
  });

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';
  const currencySymbol = currency === 'ILS' ? '₪' : '$';

  // Apply dir/lang attributes and persist preference
  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', language);
    try {
      localStorage.setItem('language', language);
    } catch {}
  }, [dir, language]);

  // Persist currency preference
  useEffect(() => {
    try {
      localStorage.setItem('currency', currency);
    } catch {}
  }, [currency]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, currency, setCurrency, currencySymbol }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

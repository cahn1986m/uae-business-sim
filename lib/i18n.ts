/**
 * نظام ترجمة بسيط (الجزء أ من ميزة اللغة) — واجهة ثابتة فقط (عناوين،
 * أزرار، تسميات، رسائل تحقق). أي نص نتيجة عشوائي/ديناميكي مخزَّن
 * بقاعدة البيانات (نتائج دراسة السوق، مفاجآت الترخيص، تقارير QC،
 * رسائل الاستقالة، نصوص خبرة مرشحي التوظيف...) غير موجود هون إطلاقاً
 * — يبقى عربي دايماً، جزء منفصل قادم. قاموس مسطّح بسيط، بدون مكتبة
 * خارجية — كافٍ لحجم المشروع الحالي.
 */

export type Language = "ar" | "en";

type Entry = { ar: string; en: string };

const dict: Record<string, Entry> = {
  // ---------------------------------------------------------------------
  // common
  // ---------------------------------------------------------------------
  "common.confirm": { ar: "تأكيد", en: "Confirm" },
  "common.confirming": { ar: "جاري التأكيد...", en: "Confirming..." },
  "common.details": { ar: "تفاصيل", en: "Details" },
  "common.detailsViewed": { ar: "شفت التفاصيل", en: "Details viewed" },
  "common.cashFull": { ar: "كاش كامل", en: "Full cash" },
  "common.installments": { ar: "تقسيط", en: "Installments" },
  "common.closeAlert": { ar: "إغلاق الإشعار", en: "Close alert" },

  // ---------------------------------------------------------------------
  // hud (FinancingCountdown)
  // ---------------------------------------------------------------------
  "hud.capital": { ar: "{amount} درهم", en: "AED {amount}" },
  "hud.remaining": { ar: "متبقي {days} يوم من {total}", en: "{days} of {total} days remaining" },
  "hud.pending": { ar: "مبالغ معلّقة: {amount} درهم", en: "Pending amounts: AED {amount}" },

  // ---------------------------------------------------------------------
  // game shell (page.tsx)
  // ---------------------------------------------------------------------
  "game.stageOf": { ar: "مرحلة {current} من {total}", en: "Stage {current} of {total}" },
  "game.next": { ar: "التالي", en: "Next" },
  "game.roundEnded": { ar: "انتهت الجولة 🎉", en: "Round finished 🎉" },
  "game.restart": { ar: "إعادة البدء (للتجربة أثناء البناء فقط)", en: "Restart (for testing during development only)" },

  // ---------------------------------------------------------------------
  // stage titles/descriptions
  // ---------------------------------------------------------------------
  "stage.1.title": { ar: "الفرصة", en: "The Opportunity" },
  "stage.1.description": {
    ar: "وصلك إشعار بفرصة مشروع بقطاع العطور والمستحضرات التجميلية، ودعوة للسفر لاستكشافها.",
    en: "You've received a notification about a business opportunity in the perfume and cosmetics sector, and an invitation to travel and explore it.",
  },
  "stage.2.title": { ar: "دراسة السوق", en: "Market Research" },
  "stage.2.description": {
    ar: "اجمع معلومات عن السوق قبل ما تقرر — بكريديت منفصل عن رأس المال الأساسي.",
    en: "Gather market information before deciding — with a credit separate from your core capital.",
  },
  "stage.3.title": { ar: "قرار التمويل", en: "Financing Decision" },
  "stage.3.description": {
    ar: "اختر مصدر تمويل مشروعك: بنك اللعبة أو مستثمرين ملائكة، بمستويات مختلفة.",
    en: "Choose your funding source: the game bank or angel investors, at different levels.",
  },
  "stage.4.title": { ar: "الترخيص", en: "Licensing" },
  "stage.4.description": {
    ar: "رخّص شركتك — عبر شركة/وكيل تراخيص، أو بنفسك مباشرة.",
    en: "License your company — through a licensing agency, or by yourself directly.",
  },
  "stage.5.title": { ar: "المكان والإيجار", en: "Location & Rent" },
  "stage.5.description": {
    ar: "اختر المنطقة والمكان يلي رح يكون فيه مصنعك.",
    en: "Choose the area and location where your factory will be.",
  },
  "stage.6.title": { ar: "المعدات", en: "Equipment" },
  "stage.6.description": {
    ar: "جهّز خط الإنتاج — معدات أوتوماتيكية أو نصف أوتوماتيكية.",
    en: "Set up your production line — automatic or semi-automatic equipment.",
  },
  "stage.7.title": { ar: "التوظيف", en: "Hiring" },
  "stage.7.description": {
    ar: "وظّف كيميائي ومحاسب لإدارة عمليات مصنعك.",
    en: "Hire a chemist and an accountant to manage your factory's operations.",
  },
  "stage.8.title": { ar: "الإنتاج", en: "Production" },
  "stage.8.description": {
    ar: "ابدأ إنتاج أول دفعة من منتجاتك.",
    en: "Start producing your first batch of products.",
  },
  "stage.9.title": { ar: "البيع", en: "Sales" },
  "stage.9.description": {
    ar: "وزّع منتجاتك عبر قنوات البيع المختلفة: أسواق تخفيضات، تجار جملة، تجار صغار.",
    en: "Distribute your products across different sales channels: discount markets, wholesalers, boutique traders.",
  },
  "stage.10.title": { ar: "النتيجة", en: "Result" },
  "stage.10.description": {
    ar: "نهاية الجولة — تقرير عن أداء بزنسك.",
    en: "End of the round — a report on your business's performance.",
  },

  // ---------------------------------------------------------------------
  // dashboard
  // ---------------------------------------------------------------------
  "dashboard.welcome": { ar: "مرحباً {name} 👋", en: "Welcome {name} 👋" },
  "dashboard.defaultUser": { ar: "مستخدم", en: "User" },
  "dashboard.subtitle": {
    ar: "هاي لوحة التحكم — دليل إن جلستك شغالة وحسابك متصل بنجاح بـ Neon Auth.",
    en: "This is your dashboard — proof that your session is active and your account is successfully connected to Neon Auth.",
  },
  "dashboard.startRound": { ar: "ابدأ الجولة", en: "Start the round" },
  "dashboard.signOut": { ar: "تسجيل خروج", en: "Sign out" },

  // ---------------------------------------------------------------------
  // marketResearch
  // ---------------------------------------------------------------------
  "marketResearch.confirmed": { ar: "قرار دراسة السوق مؤكّد.", en: "Market research decision confirmed." },
  "marketResearch.creditLine": {
    ar: "الحد الأقصى: {credit} — المتبقي: {remaining}",
    en: "Maximum: {credit} — Remaining: {remaining}",
  },
  "marketResearch.service.feasibility": { ar: "دراسة جدوى رسمية", en: "Official feasibility study" },
  "marketResearch.service.consultants": { ar: "استشاريين من إعلانات", en: "Consultants from ads" },
  "marketResearch.service.hotel5star": {
    ar: "فندق 5 نجوم (شبكة علاقات راقية)",
    en: "5-star hotel (upscale networking)",
  },
  "marketResearch.service.hotel2star": {
    ar: "فندق نجمتين (اختلاط بالعاملين)",
    en: "2-star hotel (mingling with staff)",
  },

  // ---------------------------------------------------------------------
  // financing
  // ---------------------------------------------------------------------
  "financing.confirmed": { ar: "قرار التمويل مؤكّد.", en: "Financing decision confirmed." },
  "financing.capitalLabel": { ar: "رأس المال:", en: "Capital:" },
  "financing.investorShareLabel": { ar: "حصة المستثمر:", en: "Investor share:" },
  "financing.deadlineLine": { ar: "مهلة الأداء: {days} يوم", en: "Performance deadline: {days} days" },
  "financing.rangeLine": {
    ar: "النطاق: {min} - {max} — مهلة {days} يوم — حصة المستثمر {percent}%",
    en: "Range: {min} - {max} — deadline {days} days — investor share {percent}%",
  },
  "financing.amountPlaceholder": { ar: "بين {min} و{max}", en: "Between {min} and {max}" },
  "financing.tier.limited": { ar: "رأس مال محدود (بنك)", en: "Limited capital (bank)" },
  "financing.tier.medium": { ar: "رأس مال متوسط (بنك+ملائكة)", en: "Medium capital (bank + angels)" },
  "financing.tier.comfortable": { ar: "رأس مال مريح (ملائكة)", en: "Comfortable capital (angels)" },
  "financing.pressure.0": {
    ar: "تجاوزت المهلة المتوقعة — البنك يتابع الوضع",
    en: "You've exceeded the expected deadline — the bank is monitoring the situation",
  },
  "financing.pressure.10": {
    ar: "تجاوزت المهلة — المستثمرون بدأوا يسألون عن التأخير",
    en: "You've exceeded the deadline — investors have started asking about the delay",
  },
  "financing.pressure.25": {
    ar: "تجاوزت المهلة بشكل خطير — ضغط حقيقي من المستثمرين، قد يتدخلوا قريباً",
    en: "You've seriously exceeded the deadline — real pressure from investors, they may intervene soon",
  },

  // ---------------------------------------------------------------------
  // licensing
  // ---------------------------------------------------------------------
  "licensing.pathLabel": { ar: "مسار الترخيص:", en: "Licensing path:" },
  "licensing.totalCostLabel": { ar: "التكلفة الإجمالية:", en: "Total cost:" },
  "licensing.totalDaysLine": { ar: "الأيام المستهلكة: {days} يوم", en: "Days consumed: {days} days" },
  "licensing.wasReady": {
    ar: "كنت جاهز لمقابلة موظف الترخيص.",
    en: "You were ready for the licensing officer meeting.",
  },
  "licensing.wasNotReady": {
    ar: "ما كنت جاهز بالكامل لمقابلة موظف الترخيص — +5 أيام إضافية.",
    en: "You weren't fully ready for the licensing officer meeting — +5 extra days.",
  },
  "licensing.noSurprises": { ar: "ما صار أي مفاجآت هالمرة.", en: "No surprises happened this time." },
  "licensing.agencyCostLine": {
    ar: "التكلفة: {cost} — المدة: {days} يوم",
    en: "Cost: {cost} — Duration: {days} days",
  },
  "licensing.selfCostLine": {
    ar: "التكلفة الأساسية: {cost} — المدة الأساسية: {days} يوم",
    en: "Base cost: {cost} — Base duration: {days} days",
  },
  "licensing.readyCheckbox": {
    ar: "عندي كل الأوراق والأجوبة جاهزة لمقابلة موظف الترخيص",
    en: "I have all the papers and answers ready for the licensing officer meeting",
  },
  "licensing.path.agency": { ar: "شركة/وكيل تراخيص", en: "Licensing company/agent" },
  "licensing.path.self": { ar: "ترخيص بنفسك", en: "License it yourself" },
  "licensing.eventCost": { ar: "+{cost} تكلفة", en: "+{cost} cost" },
  "licensing.eventDays": { ar: "+{days} يوم", en: "+{days} days" },

  // ---------------------------------------------------------------------
  // rent
  // ---------------------------------------------------------------------
  "rent.decisionLabel": { ar: "قرار الإيجار:", en: "Rent decision:" },
  "rent.finalPriceLabel": { ar: "السعر النهائي:", en: "Final price:" },
  "rent.negotiationSuccessLine": {
    ar: "تفاوض ناجح — خصم {percent}%",
    en: "Successful negotiation — {percent}% discount",
  },
  "rent.paidCash": { ar: "دُفع كاش كامل: {amount}", en: "Paid in full cash: {amount}" },
  "rent.paidInstallments": {
    ar: "دُفع الآن: {amount} — قسط شهري: {monthly} لـ12 شهر",
    en: "Paid now: {amount} — monthly installment: {monthly} for 12 months",
  },
  "rent.surprisesTitle": { ar: "اكتشفت نواقص بعد التأكيد!", en: "You discovered missing items after confirming!" },
  "rent.surprisesTotal": {
    ar: "إجمالي المفاجآت: {amount} (اتخصمت فوراً)",
    en: "Total surprises: {amount} (deducted immediately)",
  },
  "rent.annualRentLine": {
    ar: "إيجار سنوي: {amount} — مساحة: {space} — {services}",
    en: "Annual rent: {amount} — space: {space} — {services}",
  },
  "rent.fullServices": { ar: "خدمات كاملة", en: "Full services" },
  "rent.missingServices": { ar: "خدمات ناقصة", en: "Missing services" },
  "rent.displayedPriceLabel": { ar: "السعر المعروض:", en: "Displayed price:" },
  "rent.afterDiscount": {
    ar: "بعد خصم التفاوض ({percent}%): {amount}",
    en: "After negotiation discount ({percent}%): {amount}",
  },
  "rent.negotiating": { ar: "جاري التفاوض...", en: "Negotiating..." },
  "rent.negotiatedSuccess": {
    ar: "تفاوضت بنجاح ({percent}% خصم)",
    en: "You negotiated successfully ({percent}% discount)",
  },
  "rent.negotiatedFailed": { ar: "تفاوضت — ما نجح", en: "You negotiated — it didn't work" },
  "rent.negotiateButton": { ar: "تفاوض على السعر", en: "Negotiate the price" },
  "rent.payingNowCash": { ar: "تدفع الآن: {amount}", en: "You pay now: {amount}" },
  "rent.payingNowInstallments": {
    ar: "دفعة أولى الآن: {amount} — قسط شهري تقريبي: {monthly} لـ12 شهر",
    en: "First payment now: {amount} — approximate monthly installment: {monthly} for 12 months",
  },
  "rent.space.small": { ar: "صغيرة", en: "Small" },
  "rent.space.medium": { ar: "متوسطة", en: "Medium" },
  "rent.space.large": { ar: "كبيرة", en: "Large" },
  "rent.option.cheap-practical": {
    ar: "منطقة صناعية بعيدة، مكان رخيص وعملي",
    en: "Remote industrial area, cheap and practical space",
  },
  "rent.option.cheap-empty": {
    ar: "منطقة صناعية بعيدة، مكان رخيص وفاضي",
    en: "Remote industrial area, cheap and empty space",
  },
  "rent.option.expensive-prime": {
    ar: "قرب معلم سياحي، مكان غالي بموقع مميز",
    en: "Near a tourist landmark, expensive space with a prime location",
  },
  "rent.option.expensive-full": {
    ar: "قرب مركز التوزيع، مكان غالي وكامل الخدمات",
    en: "Near a distribution center, expensive space with full services",
  },

  // ---------------------------------------------------------------------
  // equipment
  // ---------------------------------------------------------------------
  "equipment.typeLabel": { ar: "نوع الخط:", en: "Line type:" },
  "equipment.workerCountLabel": { ar: "عدد عمال الإنتاج:", en: "Number of production workers:" },
  "equipment.workerMonthlyTotalLabel": {
    ar: "راتب العمال الشهري الإجمالي:",
    en: "Total monthly worker salary:",
  },
  "equipment.paidCash": { ar: "دُفع كاش كامل: {amount}", en: "Paid in full cash: {amount}" },
  "equipment.paidInstallments": {
    ar: "دُفع الآن: {amount} — قسط شهري: {monthly} لـ12 شهر",
    en: "Paid now: {amount} — monthly installment: {monthly} for 12 months",
  },
  "equipment.spaceBudget": {
    ar: "ميزانية المساحة المتاحة: {budget} وحدة",
    en: "Available space budget: {budget} units",
  },
  "equipment.spaceUnfit": {
    ar: "⚠️ ما يناسب مساحتك المتاحة ({budget} وحدة)",
    en: "⚠️ Doesn't fit your available space ({budget} units)",
  },
  "equipment.costSpaceWorkersLine": {
    ar: "التكلفة: {cost} — مساحة: {space} وحدة — عمال مقترح: {workers} — {paymentOptions}",
    en: "Cost: {cost} — space: {space} units — suggested workers: {workers} — {paymentOptions}",
  },
  "equipment.cashOrInstallments": { ar: "كاش أو تقسيط", en: "Cash or installments" },
  "equipment.cashOnly": { ar: "كاش فقط", en: "Cash only" },
  "equipment.workerCountInputLabel": {
    ar: "عدد عمال الإنتاج (المقترح: {suggested})",
    en: "Number of production workers (suggested: {suggested})",
  },
  "equipment.workerMonthlyPreview": {
    ar: "راتب شهري إجمالي للعمال: {total} ({salary} × {count})",
    en: "Total monthly worker salary: {total} ({salary} × {count})",
  },
  "equipment.option.automatic": { ar: "خط أوتوماتيكي كامل", en: "Full automatic line" },
  "equipment.option.semi-automatic": { ar: "خط نصف أوتوماتيكي", en: "Semi-automatic line" },

  // ---------------------------------------------------------------------
  // hiring
  // ---------------------------------------------------------------------
  "hiring.hiredLine": { ar: "تم التوظيف — خبرة: {experience}", en: "Hired — experience: {experience}" },
  "hiring.notHired": { ar: "بدون توظيف", en: "Not hired" },
  "hiring.salaryLine": { ar: "الراتب الشهري: {salary}", en: "Monthly salary: {salary}" },
  "hiring.role.chemist": { ar: "كيميائي/فورميوليتور", en: "Chemist/Formulator" },
  "hiring.role.accountant": { ar: "محاسب", en: "Accountant" },
  "hiring.choice.junior": { ar: "مرشح جونيور", en: "Junior candidate" },
  "hiring.choice.senior": { ar: "مرشح سينيور", en: "Senior candidate" },
  "hiring.choice.none": { ar: "لا توظف", en: "Don't hire" },
  "hiring.experience.junior": { ar: "جونيور", en: "Junior" },
  "hiring.experience.senior": { ar: "سينيور", en: "Senior" },
  "hiring.bio.chemist.junior": {
    ar: "متخرج حديثاً من كلية الكيمياء، اشتغل سنة بمختبر تجميل صغير — حماسي ومتابع، بس لسا بيتعلم دقة القياسات.",
    en: "A recent chemistry graduate who spent a year at a small cosmetics lab — enthusiastic and attentive, but still mastering precise measurements.",
  },
  "hiring.bio.chemist.senior": {
    ar: "خبرة 12 سنة بتصنيع العطور والمستحضرات، اشتغل سابقاً بمصنع إقليمي معروف — دقيق جداً وبيعرف يعالج مشاكل التركيبة بسرعة.",
    en: "12 years of experience manufacturing perfumes and cosmetics, previously at a well-known regional factory — highly precise and quick to solve formulation problems.",
  },
  "hiring.bio.accountant.junior": {
    ar: "حديث التخرج بمحاسبة، شغل شهرين متدرب بمكتب محاسبة — منظم بس بيحتاج مراجعة على فواتيره لأول فترة.",
    en: "A recent accounting graduate who interned for two months at an accounting firm — organized, but their invoices will need review at first.",
  },
  "hiring.bio.accountant.senior": {
    ar: "خبرة 10 سنين بمحاسبة شركات تصنيع صغيرة ومتوسطة، متعوّد على التحصيل والفواتير المعقدة — نادراً ما يفوته شي.",
    en: "10 years of experience in accounting for small and mid-sized manufacturing companies, well-versed in collections and complex invoicing — rarely misses a thing.",
  },

  // ---------------------------------------------------------------------
  // production
  // ---------------------------------------------------------------------
  "production.finalProducedLine": {
    ar: "أنتجت {units} وحدة هذه الدورة",
    en: "You produced {units} units this cycle",
  },
  "production.beforeWasteLine": {
    ar: "(قبل الهدر والأخطاء: {units} وحدة)",
    en: "(before waste and errors: {units} units)",
  },
  "production.qualityLine": {
    ar: "جودة: {quality} — صغير: {small} — كبير: {large}",
    en: "Quality: {quality} — small: {small} — large: {large}",
  },
  "production.cycleInventoryLine": {
    ar: "دورة رقم {number} — مخزون المواد الخام الحالي: {inventory}",
    en: "Cycle #{number} — current raw material inventory: {inventory}",
  },
  "production.newCycleButton": { ar: "دورة إنتاج جديدة", en: "New production cycle" },
  "production.capacityLine": {
    ar: "طاقة الإنتاج لهذه الدورة: {capacity} وحدة",
    en: "Production capacity for this cycle: {capacity} units",
  },
  "production.inventoryLine": {
    ar: "مخزون المواد الخام الحالي: {inventory}",
    en: "Current raw material inventory: {inventory}",
  },
  "production.purchaseTitle": { ar: "شراء مواد خام", en: "Purchase raw materials" },
  "production.unitPriceLine": { ar: "سعر الوحدة: {price} درهم", en: "Unit price: AED {price}" },
  "production.quantityLabel": { ar: "الكمية المطلوب شراؤها", en: "Quantity to purchase" },
  "production.estimatedCost": {
    ar: "التكلفة التقديرية: {cost} درهم",
    en: "Estimated cost: AED {cost}",
  },
  "production.bulkDiscountSuffix": {
    ar: " (شامل خصم شراء بالجملة {percent}%)",
    en: " (includes a {percent}% bulk purchase discount)",
  },
  "production.modeTitle": { ar: "وضع المعالجة", en: "Processing mode" },
  "production.lineTitle": { ar: "خط المنتج", en: "Product line" },
  "production.packagingTitle": {
    ar: "توزيع التعبئة (النسبة يجب أن تجمع 100%)",
    en: "Packaging distribution (percentages must add up to 100%)",
  },
  "production.smallPercentLabel": { ar: "نسبة التعبئة الصغيرة (%)", en: "Small packaging percentage (%)" },
  "production.largePercentLabel": { ar: "نسبة التعبئة الكبيرة (%)", en: "Large packaging percentage (%)" },
  "production.percentSum": { ar: "المجموع الحالي: {sum}%", en: "Current total: {sum}%" },
  "production.percentInvalidSuffix": { ar: " — لازم يكون 100 بالضبط", en: " — must be exactly 100" },
  "production.qcLabel": { ar: "فحص جودة (QC) — {cost} درهم", en: "Quality check (QC) — AED {cost}" },
  "production.submitButton": { ar: "شراء وإنتاج", en: "Purchase & produce" },
  "production.submitting": { ar: "جاري الشراء...", en: "Purchasing..." },
  "production.supplier.cheap": { ar: "مورّد رخيص", en: "Cheap supplier" },
  "production.supplier.trusted": { ar: "مورّد موثوق", en: "Trusted supplier" },
  "production.mode.fast": { ar: "معالجة سريعة (جودة أقل)", en: "Fast processing (lower quality)" },
  "production.mode.precise": { ar: "معالجة دقيقة (جودة أعلى)", en: "Precise processing (higher quality)" },
  "production.modeHint.fast": {
    ar: "كل 1 وحدة مادة خام → 2 وحدة منتج",
    en: "Every 1 unit of raw material → 2 units of product",
  },
  "production.modeHint.precise": {
    ar: "كل 2 وحدة مادة خام → 1 وحدة منتج",
    en: "Every 2 units of raw material → 1 unit of product",
  },
  "production.line.single": { ar: "منتج واحد", en: "Single product" },
  "production.line.diversified": { ar: "تنويع السلة", en: "Diversified basket" },
  "production.quality.low": { ar: "منخفضة", en: "Low" },
  "production.quality.high": { ar: "عالية", en: "High" },

  // ---------------------------------------------------------------------
  // sales
  // ---------------------------------------------------------------------
  "sales.locationEffectTitle": {
    ar: "أثر الموقع عند دخولك المرحلة",
    en: "Location effect upon entering this stage",
  },
  "sales.employeeHiredLine": {
    ar: "موظف مبيعات موظّف — عمولته {percent}% على كل عملية بيع",
    en: "Sales employee hired — {percent}% commission on every sale",
  },
  "sales.employeeTitle": { ar: "موظف مبيعات", en: "Sales employee" },
  "sales.employeeDescription": {
    ar: "بونص فوري: +30 وحدة (أسواق/جملة) و+15 وحدة (تجار صغار) — مقابل عمولة {percent}% على كل عملية بيع تالية",
    en: "Instant bonus: +30 units (markets/wholesale) and +15 units (boutique traders) — for a {percent}% commission on every subsequent sale",
  },
  "sales.hireEmployeeButton": { ar: "توظيف موظف مبيعات", en: "Hire a sales employee" },
  "sales.saleTitle": { ar: "بيع", en: "Sell" },
  "sales.saleSuccess": {
    ar: "بيع ناجح: {units} وحدة عبر {channel} — إيراد إجمالي {revenue} درهم",
    en: "Sale successful: {units} units via {channel} — total revenue AED {revenue}",
  },
  "sales.deferredSuffix": {
    ar: " — مؤجل التحصيل ({method}), ما انضاف لرأس المال بعد",
    en: " — collection deferred ({method}), not yet added to capital",
  },
  "sales.marginLine": {
    ar: "هامش الربح: {percent}% — المتاح للبيع: {available} وحدة",
    en: "Profit margin: {percent}% — available for sale: {available} units",
  },
  "sales.commissionSuffix": {
    ar: " — السعر بعد خصم عمولة الموظف",
    en: " — price after employee commission deduction",
  },
  "sales.lockedLine": {
    ar: "مقفولة — تحتاج تنويع سلة (productLineType=diversified) بدورة إنتاج واحدة على الأقل",
    en: "Locked — requires a diversified basket (productLineType=diversified) in at least one production cycle",
  },
  "sales.paymentMethodTitle": {
    ar: "طريقة الدفع (تسهيلات تجار الجملة)",
    en: "Payment method (wholesaler credit terms)",
  },
  "sales.marginPercentLine": { ar: "{label} — هامش {percent}%", en: "{label} — {percent}% margin" },
  "sales.quantityLabel": { ar: "الكمية المطلوب بيعها", en: "Quantity to sell" },
  "sales.submitButton": { ar: "بيع", en: "Sell" },
  "sales.submitting": { ar: "جاري البيع...", en: "Selling..." },
  "sales.adCampaignTitle": {
    ar: "حملة إعلانية ({count} حملة سابقة)",
    en: "Ad campaign ({count} previous campaigns)",
  },
  "sales.adCampaignSuccess": {
    ar: "الحملة ربحت {units} وحدة عبر {channel}",
    en: "The campaign won {units} units via {channel}",
  },
  "sales.budgetLabel": { ar: "الميزانية (حد أدنى {min})", en: "Budget (minimum {min})" },
  "sales.launchButton": { ar: "إطلاق حملة إعلانية", en: "Launch ad campaign" },
  "sales.launching": { ar: "جاري الإطلاق...", en: "Launching..." },
  "sales.channel.discount-market": { ar: "أسواق تخفيضات", en: "Discount markets" },
  "sales.channel.wholesaler": { ar: "تجار جملة", en: "Wholesalers" },
  "sales.channel.boutique-trader": { ar: "تجار صغار", en: "Boutique traders" },
  "sales.adTarget.premium": { ar: "نحو تجار صغار", en: "Toward boutique traders" },
  "sales.adTarget.wholesale": { ar: "نحو التجار", en: "Toward traders" },
  "sales.adTarget.discount": { ar: "نحو تخفيضات", en: "Toward discounts" },
  "sales.payment.cash": { ar: "كاش فوري", en: "Immediate cash" },
  "sales.payment.credit-30": { ar: "تسهيلات 30 يوم", en: "30-day credit terms" },
  "sales.payment.credit-60": { ar: "تسهيلات 60 يوم", en: "60-day credit terms" },
  "sales.payment.credit-90": { ar: "تسهيلات 90 يوم", en: "90-day credit terms" },

  // ---------------------------------------------------------------------
  // result
  // ---------------------------------------------------------------------
  "result.success": { ar: "🎉 نجحت بالمشروع", en: "🎉 Your business succeeded" },
  "result.failure": { ar: "📉 خسرت بالمشروع", en: "📉 Your business lost money" },
  "result.startingCapital": { ar: "رأس المال الأصلي: {amount} درهم", en: "Original capital: AED {amount}" },
  "result.finalNetWorth": {
    ar: "الوضع النهائي (صافي الثروة): {amount} درهم",
    en: "Final position (net worth): AED {amount}",
  },
  "result.pendingNote": {
    ar: " (يشمل {amount} درهم مبالغ لسا بالطريق — تسهيلات لم تُحصَّل بعد)",
    en: " (includes AED {amount} still on the way — uncollected credit terms)",
  },
  "result.netProfit": { ar: "ربح صافي", en: "Net profit" },
  "result.netLoss": { ar: "خسارة صافية", en: "Net loss" },
  "result.marketResearchTitle": { ar: "دراسة السوق", en: "Market Research" },
  "result.notUsedYet": { ar: "لم يُستخدم بعد بمرحلة البيع.", en: "Not used yet in the sales stage." },
  "result.financingTitle": { ar: "التمويل", en: "Financing" },
  "result.levelLabel": { ar: "المستوى: {level}", en: "Level: {level}" },
  "result.unknownLevel": { ar: "غير معروف", en: "Unknown" },
  "result.capitalShare": {
    ar: "رأس المال: {amount} درهم — حصة المستثمر: {percent}%",
    en: "Capital: AED {amount} — investor share: {percent}%",
  },
  "result.deadlineLine": {
    ar: "مهلة الأداء: {days} يوم — الأيام المستهلكة فعلياً: {consumed}",
    en: "Performance deadline: {days} days — days actually consumed: {consumed}",
  },
  "result.overdue": { ar: "تجاوزت المهلة المحددة.", en: "You exceeded the set deadline." },
  "result.withinDeadline": { ar: "ضمن المهلة المحددة.", en: "Within the set deadline." },
  "result.licensingTitle": { ar: "الترخيص", en: "Licensing" },
  "result.pathCostLine": {
    ar: "المسار: {path} — التكلفة الكلية: {cost} درهم — المدة: {days} يوم",
    en: "Path: {path} — total cost: AED {cost} — duration: {days} days",
  },
  "result.surpriseLine": {
    ar: "مفاجأة: {label} — تكلفة إضافية {cost} درهم، +{days} يوم",
    en: "Surprise: {label} — extra cost AED {cost}, +{days} days",
  },
  "result.noSurprises": { ar: "لم تحصل أي مفاجآت.", en: "No surprises occurred." },
  "result.rentTitle": { ar: "المكان والإيجار", en: "Location & Rent" },
  "result.rentOptionLine": {
    ar: "الخيار: {option} — السعر النهائي: {price} درهم",
    en: "Option: {option} — final price: AED {price}",
  },
  "result.negotiationLine": { ar: "التفاوض: {status}", en: "Negotiation: {status}" },
  "result.negotiationSucceeded": { ar: "نجح (خصم {percent}%)", en: "Succeeded ({percent}% discount)" },
  "result.negotiationFailed": { ar: "فشل", en: "Failed" },
  "result.negotiationNotUsed": { ar: "لم يُستخدم", en: "Not used" },
  "result.paymentMethodLine": { ar: "طريقة الدفع: {method}", en: "Payment method: {method}" },
  "result.equipmentTitle": { ar: "المعدات والتوظيف", en: "Equipment & Hiring" },
  "result.equipmentLine": {
    ar: "المعدات: {equipment} — عدد العمال: {count}",
    en: "Equipment: {equipment} — worker count: {count}",
  },
  "result.chemistLine": { ar: "الكيميائي: {status}", en: "Chemist: {status}" },
  "result.accountantLine": { ar: "المحاسب: {status}", en: "Accountant: {status}" },
  "result.hiredWithExperience": { ar: "موظّف ({experience})", en: "Hired ({experience})" },
  "result.notHired": { ar: "غير موظّف", en: "Not hired" },
  "result.chemistErrorsLine": {
    ar: "أخطاء كيميائية فعلية عبر كل دورات الإنتاج: {count}",
    en: "Actual chemist errors across all production cycles: {count}",
  },
  "result.productionTitle": { ar: "الإنتاج", en: "Production" },
  "result.productionLine": {
    ar: "عدد دورات الإنتاج: {count} — إجمالي الوحدات المنتَجة فعلياً: {units}",
    en: "Number of production cycles: {count} — total units actually produced: {units}",
  },
  "result.salesTitle": { ar: "البيع", en: "Sales" },
  "result.channelRevenueLine": { ar: "{channel}: {amount} درهم", en: "{channel}: AED {amount}" },
  "result.wholesaleBreakdown": {
    ar: "تفصيل تجار الجملة حسب طريقة الدفع: ",
    en: "Wholesaler breakdown by payment method: ",
  },
  "result.wholesaleBreakdownItem": {
    ar: "{method} ({count} عملية، {amount} درهم)",
    en: "{method} ({count} transactions, AED {amount})",
  },
  "result.salesEmployeeLine": { ar: "موظف مبيعات: {status}", en: "Sales employee: {status}" },
  "result.employedWithCommission": {
    ar: "موظّف — إجمالي عمولة مدفوعة {amount} درهم",
    en: "Hired — total commission paid AED {amount}",
  },
  "result.campaignLine": {
    ar: "حملة #{number} ({target}، ميزانية {budget} درهم): ربحت {units} وحدة عبر {channel}",
    en: "Campaign #{number} ({target}, budget AED {budget}): won {units} units via {channel}",
  },
  "result.noCampaigns": { ar: "لم تُشغَّل أي حملة إعلانية.", en: "No ad campaign was launched." },

  // ---------------------------------------------------------------------
  // errors (server action validation/rejection messages)
  // ---------------------------------------------------------------------
  "error.marketResearch.overBudget": {
    ar: "مجموع الاختيارات ({total}) أكبر من الحد الأقصى ({credit}).",
    en: "The total of your selections ({total}) exceeds the maximum ({credit}).",
  },
  "error.financing.tierRequired": { ar: "لازم تختار مستوى تمويل.", en: "You must choose a financing level." },
  "error.financing.amountRange": {
    ar: "رأس المال لازم يكون رقم صحيح بين {min} و{max}.",
    en: "Capital must be a whole number between {min} and {max}.",
  },
  "error.licensing.pathRequired": { ar: "لازم تختار مسار ترخيص.", en: "You must choose a licensing path." },
  "error.licensing.agencyInsufficientFunds": {
    ar: "التكلفة ({cost}) أكبر من رصيدك المتاح ({capital}).",
    en: "The cost ({cost}) exceeds your available balance ({capital}).",
  },
  "error.licensing.selfInsufficientFunds": {
    ar: "التكلفة الإجمالية ({cost}) أكبر من رصيدك المتاح ({capital}).",
    en: "The total cost ({cost}) exceeds your available balance ({capital}).",
  },
  "error.rent.alreadyConfirmed": { ar: "قرار الإيجار مؤكّد أصلاً.", en: "The rent decision is already confirmed." },
  "error.rent.optionRequired": { ar: "لازم تختار خيار إيجار.", en: "You must choose a rent option." },
  "error.rent.paymentMethodRequired": { ar: "لازم تختار طريقة دفع.", en: "You must choose a payment method." },
  "error.rent.insufficientFunds": {
    ar: "الدفعة المطلوبة ({amount}) أكبر من رصيدك المتاح ({capital}).",
    en: "The required payment ({amount}) exceeds your available balance ({capital}).",
  },
  "error.equipment.typeRequired": { ar: "لازم تختار نوع خط.", en: "You must choose a line type." },
  "error.equipment.spaceUnfit": {
    ar: "هذا الخط لا يناسب المساحة المستأجرة.",
    en: "This line doesn't fit your rented space.",
  },
  "error.equipment.workerCountInvalid": {
    ar: "عدد العمال لازم يكون رقم صحيح 1 أو أكثر.",
    en: "Worker count must be a whole number of 1 or more.",
  },
  "error.equipment.paymentMethodRequired": { ar: "لازم تختار طريقة دفع.", en: "You must choose a payment method." },
  "error.equipment.installmentsNotAllowed": {
    ar: "هذا الخط كاش إجباري — ما في خيار تقسيط له.",
    en: "This line requires cash payment — installments aren't available for it.",
  },
  "error.equipment.insufficientFunds": {
    ar: "التكلفة المطلوبة ({amount}) أكبر من رصيدك المتاح ({capital}).",
    en: "The required cost ({amount}) exceeds your available balance ({capital}).",
  },
  "error.hiring.chemistRequired": {
    ar: "لازم تقرر بخصوص الكيميائي (وظّف أو لا توظف).",
    en: "You must decide about the chemist (hire or don't hire).",
  },
  "error.hiring.accountantRequired": {
    ar: "لازم تقرر بخصوص المحاسب (وظّف أو لا توظف).",
    en: "You must decide about the accountant (hire or don't hire).",
  },
  "error.hiring.visaInsufficientFunds": {
    ar: "تكلفة الإقامة المطلوبة ({amount}) أكبر من رصيدك المتاح ({capital}).",
    en: "The required visa cost ({amount}) exceeds your available balance ({capital}).",
  },
  "error.production.supplierRequired": { ar: "لازم تختار مورّد.", en: "You must choose a supplier." },
  "error.production.quantityInvalid": {
    ar: "الكمية لازم تكون رقم صحيح 0 أو أكثر.",
    en: "Quantity must be a whole number of 0 or more.",
  },
  "error.production.modeRequired": { ar: "لازم تختار وضع معالجة.", en: "You must choose a processing mode." },
  "error.production.lineRequired": { ar: "لازم تختار نوع خط المنتج.", en: "You must choose a product line type." },
  "error.production.percentInvalid": {
    ar: "نسب التعبئة لازم تكون أرقام صحيحة 0 أو أكثر.",
    en: "Packaging percentages must be whole numbers of 0 or more.",
  },
  "error.production.percentSumInvalid": {
    ar: "نسب التعبئة لازم تجمع 100 بالضبط (المجموع الحالي: {sum}).",
    en: "Packaging percentages must add up to exactly 100 (current total: {sum}).",
  },
  "error.production.equipmentRequired": {
    ar: "لازم تأكّد قرار المعدات قبل الإنتاج.",
    en: "You must confirm the equipment decision before production.",
  },
  "error.production.insufficientFunds": {
    ar: "التكلفة الإجمالية ({cost}{qcSuffix}) أكبر من رصيدك المتاح ({capital}).",
    en: "The total cost ({cost}{qcSuffix}) exceeds your available balance ({capital}).",
  },
  "error.production.qcSuffix": {
    ar: " — شاملة {qcCost} لفحص الجودة",
    en: " — including {qcCost} for the quality check",
  },
  "error.production.storageFull": {
    ar: "المستودع ممتلئ — بع من مخزونك الحالي أو وسّع مساحتك أولاً.",
    en: "Your warehouse is full — sell from your current stock or expand your space first.",
  },
  "error.sales.channelRequired": { ar: "لازم تختار قناة بيع.", en: "You must choose a sales channel." },
  "error.sales.quantityInvalid": {
    ar: "الكمية لازم تكون رقم صحيح 1 أو أكثر.",
    en: "Quantity must be a whole number of 1 or more.",
  },
  "error.sales.paymentMethodRequired": {
    ar: "لازم تختار طريقة دفع لقناة تجار الجملة.",
    en: "You must choose a payment method for the wholesaler channel.",
  },
  "error.sales.boutiqueLocked": {
    ar: "قناة تجار صغار مقفولة — لازم تنويع السلة (productLineType=diversified) بدورة إنتاج واحدة على الأقل.",
    en: "The boutique traders channel is locked — you need a diversified basket (productLineType=diversified) in at least one production cycle.",
  },
  "error.sales.quantityExceeds": {
    ar: "الكمية المطلوبة ({requested}) أكبر من المتاح فعلياً ({available}).",
    en: "The requested quantity ({requested}) exceeds what's actually available ({available}).",
  },
  "error.ads.targetRequired": { ar: "لازم تختار هدف توجيه.", en: "You must choose a targeting goal." },
  "error.ads.budgetInvalid": {
    ar: "الميزانية لازم تكون رقم صحيح {min} أو أكثر.",
    en: "The budget must be a whole number of {min} or more.",
  },
  "error.ads.insufficientFunds": {
    ar: "الميزانية ({budget}) أكبر من رصيدك المتاح ({capital}).",
    en: "The budget ({budget}) exceeds your available balance ({capital}).",
  },
};

/** يستبدل {key} بقيمها ضمن النص لو تم تمرير params. */
export function t(key: string, language: Language, params?: Record<string, string | number>): string {
  const entry = dict[key];
  let text = entry ? entry[language] : key;
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      text = text.split(`{${paramKey}}`).join(String(value));
    }
  }
  return text;
}

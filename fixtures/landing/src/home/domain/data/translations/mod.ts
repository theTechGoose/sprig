import { Service } from "@sprig/kit";

@Service()
export class TranslationsService {
  lang = "en";

  t = {
    nav: {
      features: { en: "Features", es: "Funciones" },
      howItWorks: { en: "How it Works", es: "Cómo Funciona" },
      pricing: { en: "Pricing", es: "Precios" },
      cta: { en: "Get Started", es: "Comenzar" },
    },
    hero: {
      tagline: { en: "For Contractors & Freelancers", es: "Para Contratistas y Freelancers" },
      headline1: { en: "You do the work.", es: "Tú haces el trabajo." },
      headline2prefix: { en: "We handle the ", es: "Nosotros manejamos " },
      flipWords: { en: ["quotes", "contracts", "invoices"], es: ["cotizaciones", "contratos", "facturas"] },
      sub: { en: "Stop leaving money on the table. Our AI-powered platform helps you create professional documents that win more jobs and get you paid faster.", es: "Deja de perder dinero. Nuestra plataforma con IA te ayuda a crear documentos profesionales." },
      cta1: { en: "Start Free Trial", es: "Prueba Gratis" },
      cta2: { en: "See How It Works", es: "Ver Cómo Funciona" },
    },
    problem: {
      title: { en: "The Problem We Solve", es: "El Problema Que Resolvemos" },
      sub: { en: "Most contractors lose money because of unprofessional paperwork", es: "La mayoría de los contratistas pierden dinero por documentos poco profesionales" },
      card1: { title: { en: "Lost Revenue", es: "Ingresos Perdidos" }, desc: { en: "Poor quotes and contracts lead to scope creep and unpaid work", es: "Cotizaciones y contratos deficientes resultan en trabajo no pagado" } },
      card2: { title: { en: "Wasted Time", es: "Tiempo Perdido" }, desc: { en: "Hours spent on paperwork instead of billable work", es: "Horas gastadas en papeleo en lugar de trabajo facturable" } },
      card3: { title: { en: "Delayed Payments", es: "Pagos Retrasados" }, desc: { en: "Unclear invoices lead to disputes and late payments", es: "Facturas confusas llevan a disputas y pagos tardíos" } },
    },
    features: {
      label: { en: "Features", es: "Funciones" },
      title: { en: "Everything You Need", es: "Todo Lo Que Necesitas" },
      sub: { en: "Professional tools designed specifically for contractors", es: "Herramientas profesionales diseñadas para contratistas" },
      card1: { title: { en: "Smart Quotes", es: "Cotizaciones Inteligentes" }, desc: { en: "AI-powered quote generation that accounts for materials, labor, and profit margins", es: "Generación de cotizaciones con IA" } },
      card2: { title: { en: "Legal Contracts", es: "Contratos Legales" }, desc: { en: "Lawyer-reviewed templates that protect you and your clients", es: "Plantillas revisadas por abogados" } },
      card3: { title: { en: "Professional Invoices", es: "Facturas Profesionales" }, desc: { en: "Clear, itemized invoices with payment tracking and reminders", es: "Facturas claras con seguimiento de pagos" } },
      card4: { title: { en: "Client Portal", es: "Portal de Clientes" }, desc: { en: "Let clients view, approve, and pay all in one place", es: "Los clientes pueden ver, aprobar y pagar en un solo lugar" } },
    },
    howItWorks: {
      label: { en: "Simple Process", es: "Proceso Simple" },
      title: { en: "How It Works", es: "Cómo Funciona" },
      step1: { title: { en: "Describe Your Job", es: "Describe Tu Trabajo" }, desc: { en: "Tell us about the project, materials needed, and timeline", es: "Cuéntanos sobre el proyecto" } },
      step2: { title: { en: "Get Documents", es: "Obtén Documentos" }, desc: { en: "We generate professional quotes, contracts, and invoices", es: "Generamos documentos profesionales" } },
      step3: { title: { en: "Get Paid", es: "Cobra" }, desc: { en: "Send to clients and track payments automatically", es: "Envía a clientes y rastrea pagos" } },
    },
    pricing: {
      label: { en: "Pricing", es: "Precios" },
      title: { en: "Simple, Transparent Pricing", es: "Precios Simples y Transparentes" },
      sub: { en: "We only make money when you make more money", es: "Solo ganamos cuando tú ganas más" },
      withoutUs: { en: "Without PaperworkMonsters", es: "Sin PaperworkMonsters" },
      withUs: { en: "With PaperworkMonsters", es: "Con PaperworkMonsters" },
      youNegotiate: { en: "You negotiate", es: "Tú negocias" },
      weGetYou: { en: "We help you get", es: "Te ayudamos a obtener" },
      ourFee: { en: "Our 10% fee", es: "Nuestra comisión del 10%" },
      youKeep: { en: "You keep", es: "Tú te quedas" },
      moreInYourPocket: { en: "$850 more in your pocket", es: "$850 más en tu bolsillo" },
      feeNote: { en: "We only charge on the extra money we help you earn", es: "Solo cobramos por el dinero extra que te ayudamos a ganar" },
      cta: { en: "Start Your Free Trial", es: "Comienza Tu Prueba Gratis" },
    },
    contact: {
      label: { en: "Get Started", es: "Comenzar" },
      title: { en: "Ready to Earn More?", es: "¿Listo Para Ganar Más?" },
      sub: { en: "Join thousands of contractors who are getting paid what they deserve", es: "Únete a miles de contratistas que cobran lo que merecen" },
      namePlaceholder: { en: "Your name", es: "Tu nombre" },
      emailPlaceholder: { en: "Your email", es: "Tu correo" },
      tradePlaceholder: { en: "Your trade (e.g., Plumber, Electrician)", es: "Tu oficio (ej: Plomero, Electricista)" },
      submit: { en: "Get Early Access", es: "Obtener Acceso Anticipado" },
      success: { en: "Thanks! We'll be in touch soon.", es: "¡Gracias! Te contactaremos pronto." },
    },
    footer: {
      copy: { en: "PaperworkMonsters. All rights reserved.", es: "PaperworkMonsters. Todos los derechos reservados." },
    },
    stats: {
      items: {
        en: ["500+ Contractors", "$2M+ Quoted", "98% Payment Rate", "4.9★ Rating"],
        es: ["500+ Contratistas", "$2M+ Cotizados", "98% Tasa de Pago", "4.9★ Calificación"],
      },
    },
  };

  tx(entry: { en: string; es: string }): string {
    return entry[this.lang as "en" | "es"] || entry.en;
  }

  setLang(lang: string) {
    this.lang = lang;
  }
}

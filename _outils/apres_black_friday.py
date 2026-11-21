"""Transforme le site Tarrelo en version « après Black Friday » (tarifs normaux)."""
import re, glob, sys, os
ROOT = sys.argv[1]
STD_BF, PREM_BF = 'https://buy.stripe.com/00waEWagC10eetP0Ltebu00', 'https://buy.stripe.com/9B600icoKcIWetPam3ebu01'
STD, PREM = 'https://buy.stripe.com/3cI8wOfAW38mfxT51Jebu02', 'https://buy.stripe.com/bJe00ibkG10edpLdyfebu03'
CTA_SUB_BF = "Installation et 1er mois offerts avec le code <strong>BLACKFRIDAY</strong>, jusqu'au 30 novembre à 23h59."
CTA_SUB = "14 jours d'essai gratuit, sans engagement. Vous gardez votre numéro."
FAQ_PRIX_BF = "Standard à 69 €/mois, Premium à 89 €/mois, sans engagement. Avec le code BLACKFRIDAY jusqu'au 30 novembre à 23h59 : 49 € et 69 €/mois à vie, installation et premier mois offerts."
FAQ_PRIX = "Standard à 69 €/mois, Premium à 89 €/mois, installation 99 €, 14 jours d'essai gratuit, sans engagement."
R = [
  (STD_BF, STD), (PREM_BF, PREM),
  ("Essayer 1 mois offert", "Essayer 14 jours gratuits"),
  ("Activer mon mois offert", "Essayer 14 jours gratuits"),
  (">1 mois offert<", ">14 jours gratuits<"),
  (CTA_SUB_BF, CTA_SUB),
  ("Installation et 1er mois offerts avec le code BLACKFRIDAY, jusqu'au 30 novembre à 23h59.", CTA_SUB),
  ("1er mois et installation offerts avec le code <strong>BLACKFRIDAY</strong>.", CTA_SUB),
  (FAQ_PRIX, FAQ_PRIX), (FAQ_PRIX_BF, FAQ_PRIX),
  ("Dès 49 €/mois", "Dès 69 €/mois"), ("dès 49 €/mois", "dès 69 €/mois"), ("Dès 49 €", "Dès 69 €"),
  ("Tarrelo coûte 49 €.", "Tarrelo coûte 69 €."),
  ("3 minutes d'inscription. Code BLACKFRIDAY : premier mois offert.", "3 minutes d'inscription. 14 jours d'essai gratuit."),
  ("Prix nets, TVA non applicable (art. 293 B du CGI). Offres Black Friday activées avec le code BLACKFRIDAY à l'inscription, jusqu'au 30 novembre 2026 à 23h59. Ensuite : Standard 69 €/mois, Premium 89 €/mois.",
   "Prix nets, TVA non applicable (art. 293 B du CGI). Installation 99 € (paiement unique). 14 jours d'essai gratuit."),
  ("Aucun prélèvement pendant le mois offert", "Aucun prélèvement d'abonnement pendant l'essai"),
  ("Comparez ce chiffre au prix de Tarrelo (<a href=\"/tarifs\">dès 49 €/mois avec le code BLACKFRIDAY</a>)", "Comparez ce chiffre au prix de Tarrelo (<a href=\"/tarifs\">dès 69 €/mois</a>)"),
  ("69 € ou 89 €/mois (49 € ou 69 € avec BLACKFRIDAY)", "69 € ou 89 €/mois"),
  ("Standard · 69 € → 49 €/mois avec BLACKFRIDAY", "Standard · 69 €/mois"),
  ("Premium · 89 € → 69 €/mois avec BLACKFRIDAY", "Premium · 89 €/mois"),
  ('<label class="field">Code promo<input name="code" value="BLACKFRIDAY" autocomplete="off"></label>\n', ''),
  (" Offre BLACKFRIDAY valable pour toute demande envoyée avant le 30 novembre 2026 à 23h59.", ""),
  ("Code BLACKFRIDAY jusqu&#x27;au 30/11 : 49 € et 69 €/mois à vie, installation et 1er mois offerts.", "Installation 99 €, 14 jours d'essai gratuit."),
  ("Tarifs : réceptionniste IA dès 49 €/mois", "Tarifs : réceptionniste IA dès 69 €/mois"),
  ("Deux formules simples, sans engagement, sans frais cachés. Jusqu'au 30 novembre à 23h59, le code BLACKFRIDAY vous fait économiser 20 € par mois à vie, plus l'installation et le premier mois.",
   "Deux formules simples, sans engagement, sans frais cachés. Installation 99 € et 14 jours d'essai gratuit."),
  ("Elle est opérationnelle en 2 jours ouvrés. L'installation est offerte avec le code BLACKFRIDAY.", "Elle est opérationnelle en 2 jours ouvrés. L'installation coûte 99 €, en une seule fois."),
  ("Récupérez ces clients dès cette semaine.", "Récupérez ces clients dès cette semaine."),
  ('dès 69 €/mois avec le code BLACKFRIDAY</a>)', 'dès 69 €/mois</a>)'),
  (", offre Black Friday.\"", ".\""), (", offre Black Friday.", "."),
]
REGEX = [
  # Carte Black Friday au-dessus des offres (avec son style et son script)
  (r'<!--bf-offer-->.*?<!--/bf-offer-->\n?', ''),
  # Bandeau Black Friday
  (r'<div class="bf-banner".*?</div>\n</div>\n?', ''),
  # Ancien bandeau éventuel (sans classe)
  (r'<div style="background: #14213D; color: #FFF8F1; font-size: 14px; font-weight: 500">\s*<div class="wrap"[^>]*>\s*<span[^>]*>Black Friday</span>.*?</div>\s*</div>\n?', ''),
  # Bloc prix : ligne barrée + badge, prix promo -> prix normal, mention du code
  (r'<p style="display: flex; align-items: center; gap: 10px; font-size: 15px"><s[^>]*>(\d+) €/mois</s><span[^>]*>−20 € Black Friday</span></p>\s*<p><span([^>]*)>\d+ €</span>', r'<p><span\2>\1 €</span>'),
  (r'<p style="font-size: 13px; color: #4A5568; margin-top: 2px">avec le code BLACKFRIDAY, jusqu\'au 30 novembre 23h59</p>', '<p style="font-size: 13px; color: #4A5568; margin-top: 2px">+ installation 99 € · 14 jours d\'essai gratuit</p>'),
  # Encart orange Black Friday au-dessus des offres
  (r'<div style="background: #FFE3DA; border: 1px solid #FF6B4A; border-radius: 14px;[^"]*">\s*<span style="font-weight: 700">Black Friday · code.*?</div>\n', ''),
  # FAQ Black Friday (accueil et tarifs) — retirées
  (r'<details style="border-bottom: 1px solid #E8DFD3"><summary[^>]*>Comment activer l\'offre Black Friday \?.*?</details>', ''),
  (r'<details style="border-bottom: 1px solid #E8DFD3"><summary[^>]*>Le prix Black Friday dure combien de temps \?.*?</details>', ''),
]
for f in glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True):
    s = open(f).read(); o = s
    for a, b in R: s = s.replace(a, b)
    for a, b in REGEX: s = re.sub(a, b, s, flags=re.S)
    # Données structurées : FAQ et offres
    s = re.sub(r'\{\s*"@type": "Question",\s*"name": "(?:Comment activer l\'offre Black Friday \?|Le prix Black Friday dure combien de temps \?)".*?\}\s*\}\s*,?', '', s, flags=re.S)
    s = s.replace('"price": "49"', '"price": "69"').replace('"name": "Premium",\n          "price": "69"', '"name": "Premium",\n          "price": "89"')
    s = re.sub(r'(\{\s*"@type": "Offer",\s*"name": "Premium",\s*"price": )"69"', r'\1"89"', s)
    s = re.sub(r',(\s*\]\s*\}\s*(?:,|\]))', r'\1', s)  # virgule finale éventuelle dans le JSON
    if s != o: open(f, 'w').write(s)

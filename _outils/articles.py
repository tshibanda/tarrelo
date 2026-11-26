"""Génère des guides SEO à partir du gabarit ressources/renvoi-appel.html."""
import json, re, html

TPL = open('ressources/renvoi-appel.html', encoding='utf-8').read()
TODAY = '2026-11-26'

ARTICLES = [
{
 'slug': 'assistant-telephonique-ia',
 'title': "Assistant téléphonique IA : fonctionnement, prix et limites",
 'seo_title': "Assistant téléphonique IA pour artisans et PME : le guide | Tarrelo",
 'desc': "Comment fonctionne un assistant téléphonique IA, ce qu'il sait faire, ce qu'il ne fait pas, combien il coûte et comment le mettre en place sans changer de numéro.",
 'body': """
<p style="margin-top: 24px">Un assistant téléphonique IA décroche à votre place quand vous ne pouvez pas répondre. Il parle avec votre client comme le ferait une secrétaire, note sa demande et vous l'envoie aussitôt. Pour un artisan sur un chantier ou une petite équipe débordée, c'est la différence entre un appel perdu et un client rappelé dans l'heure.</p>
<h2>Comment ça marche, concrètement</h2>
<p>Vous gardez votre numéro. Vous activez simplement un <a href="/ressources/renvoi-appel">renvoi d'appel</a> sur non-réponse, occupation et injoignable. Votre téléphone sonne comme d'habitude : si vous décrochez, rien ne change. Si vous ne pouvez pas, l'appel bascule vers l'assistant.</p>
<p>L'assistant écoute, comprend la demande grâce à la reconnaissance vocale, répond avec une voix naturelle, puis vous transmet un récapitulatif par SMS ou e-mail : qui a appelé, pourquoi, son numéro, et l'action prise (rendez-vous, rappel, urgence).</p>
<h2>Ce qu'un bon assistant sait faire</h2>
<ul>
<li><strong>Décrocher 24 h/24</strong>, y compris le soir, le week-end et pendant vos interventions.</li>
<li><strong>Répondre aux questions courantes</strong> : horaires, zone d'intervention, délais, tarifs de déplacement que vous lui avez indiqués.</li>
<li><strong>Prendre les rendez-vous</strong> dans votre agenda, sans double réservation.</li>
<li><strong>Repérer les urgences</strong> (fuite, panne, serrure bloquée) et vous les signaler en priorité.</li>
<li><strong>Vous envoyer un récap</strong> clair après chaque appel, pour rappeler en connaissant déjà le besoin.</li>
</ul>
<h2>Ce qu'il ne fait pas (et ne doit pas faire)</h2>
<p>Un assistant sérieux ne remplace pas votre expertise. Il ne pose pas de diagnostic technique, ne donne pas de prix ferme à votre place et ne promet rien que vous ne lui avez pas confié. Il annonce aussi clairement qu'il est un assistant virtuel : c'est une question de transparence vis-à-vis de vos clients.</p>
<h2>Combien ça coûte ?</h2>
<p>Les offres du marché vont de quelques dizaines d'euros par mois pour un assistant simple à plusieurs centaines pour un secrétariat humain externalisé. Chez Tarrelo, l'offre Standard est à 69 € par mois et la Premium à 89 € par mois, sans engagement. Comparez toujours avec le coût d'un appel manqué : notre <a href="/calculateur">calculateur de pertes</a> vous donne une estimation en 30 secondes.</p>
<table><tr><th>Solution</th><th>Disponibilité</th><th>Ce que vous recevez</th></tr>
<tr><td>Répondeur classique</td><td>24 h/24</td><td>Un message vocal, quand le client en laisse un</td></tr>
<tr><td>Secrétariat humain</td><td>Heures ouvrées le plus souvent</td><td>Un message noté par une personne</td></tr>
<tr><td>Assistant IA</td><td>24 h/24</td><td>Une conversation complète, un récap et souvent un rendez-vous</td></tr></table>
<p>Pour aller plus loin, lisez notre <a href="/comparatif-secretariat">comparatif secrétariat téléphonique</a>.</p>
<h2>Comment choisir</h2>
<ul>
<li><strong>Votre numéro reste le vôtre</strong> : fuyez les solutions qui imposent un nouveau numéro à communiquer.</li>
<li><strong>Le réglage sur votre métier</strong> : un plombier et un cabinet paramédical n'ont pas les mêmes appels.</li>
<li><strong>Le récap</strong> : il doit arriver tout de suite, par SMS, et être lisible en 10 secondes.</li>
<li><strong>L'essai</strong> : testez-le avec votre propre téléphone avant de payer. C'est le but de notre <a href="/demo">démo personnalisée</a>.</li>
<li><strong>Sans engagement</strong> : vous devez pouvoir arrêter à tout moment.</li>
</ul>
<div class="card" style="margin-top: 40px; background: #FFE3DA; border-color: #FF6B4A"><p style="font-weight: 700; font-size: 18px">Entendez-le décrocher au nom de votre entreprise</p><p style="margin-top: 8px">En 3 minutes, nous préparons un assistant à votre nom. Appelez-le depuis votre mobile et faites comme un client.</p><p style="margin-top: 14px"><a href="/demo" class="btn" style="background: #FF6B4A; color: #14213D">Tester ma démo gratuite</a></p></div>
""",
 'faq': [
  ("Mes clients savent-ils qu'ils parlent à une IA ?", "Oui. L'assistant se présente comme un assistant virtuel. La plupart des clients cherchent surtout à être pris en charge rapidement et apprécient d'avoir une réponse immédiate."),
  ("Faut-il changer de numéro ?", "Non. Vous activez un renvoi d'appel vers l'assistant depuis votre téléphone. Vos clients composent votre numéro habituel."),
  ("Que se passe-t-il en cas d'urgence ?", "L'assistant repère les situations urgentes et vous les signale en priorité, par SMS, pour que vous puissiez rappeler immédiatement."),
 ],
},
{
 'slug': 'ne-plus-rater-appels-chantier',
 'title': "Artisan : 7 solutions pour ne plus rater d'appels sur un chantier",
 'seo_title': "Ne plus rater d'appels sur un chantier : 7 solutions pour artisans | Tarrelo",
 'desc': "Répondeur, renvoi, créneaux de rappel, secrétariat, assistant IA… Les solutions concrètes pour qu'aucun client ne tombe dans le vide pendant vos interventions.",
 'body': """
<p style="margin-top: 24px">Les mains dans une chaudière, sur un toit ou au volant entre deux interventions : décrocher n'est pas toujours possible. Or un client qui tombe sur une messagerie appelle souvent le concurrent suivant. Voici sept solutions, de la plus simple à la plus complète, pour ne plus laisser filer ces appels.</p>
<h2>1. Un message d'accueil qui donne envie d'attendre</h2>
<p>Votre messagerie est la première impression. Annoncez votre nom, quand vous rappelez et ce qu'il faut laisser comme information. Nos <a href="/ressources/message-accueil-telephonique">modèles de message d'accueil</a> sont prêts à copier.</p>
<h2>2. Des créneaux de rappel fixes</h2>
<p>Bloquez deux moments par jour, par exemple à la pause de midi et en fin de journée, pour rappeler tous les appels manqués. Le client sait qu'il sera rappelé, vous n'êtes plus interrompu en permanence.</p>
<h2>3. Le renvoi vers un collègue ou un proche</h2>
<p>Un <a href="/ressources/renvoi-appel">renvoi d'appel sur non-réponse</a> peut basculer vos appels vers quelqu'un de disponible. Efficace, à condition que cette personne soit vraiment joignable et connaisse votre activité.</p>
<h2>4. Le SMS automatique d'appel manqué</h2>
<p>Certaines applications envoient un SMS quand vous ne décrochez pas (« Je suis en intervention, je vous rappelle dans l'heure »). C'est rassurant, mais le client n'a toujours pas pu expliquer sa demande.</p>
<h2>5. La prise de rendez-vous en ligne</h2>
<p>Un lien de réservation sur votre fiche Google et votre site permet aux clients de choisir un créneau sans vous appeler. Utile pour les demandes non urgentes, beaucoup moins pour une fuite ou une panne.</p>
<h2>6. Le secrétariat téléphonique externalisé</h2>
<p>Une personne décroche à votre nom et prend un message. C'est humain, mais souvent limité aux heures ouvrées et facturé au volume d'appels. Notre <a href="/comparatif-secretariat">comparatif</a> détaille les écarts de prix.</p>
<h2>7. L'assistant téléphonique IA</h2>
<p>Un <a href="/ressources/assistant-telephonique-ia">assistant IA</a> décroche 24 h/24 quand vous ne pouvez pas, comprend la demande, prend le rendez-vous et vous envoie un récap par SMS. Vous gardez votre numéro et rappelez en connaissant déjà le besoin du client.</p>
<h2>Le bon combo</h2>
<p>Pour la plupart des artisans, la combinaison gagnante est simple : un renvoi d'appel sur non-réponse vers un assistant, un récap par SMS après chaque appel et deux créneaux de rappel par jour pour les demandes qui le nécessitent. Mesurez ce que vous perdez aujourd'hui avec notre <a href="/calculateur">calculateur</a> ou faites le <a href="/test-accueil">test de votre accueil téléphonique</a>.</p>
<div class="card" style="margin-top: 40px; background: #FFE3DA; border-color: #FF6B4A"><p style="font-weight: 700; font-size: 18px">Essayez la solution 7 gratuitement</p><p style="margin-top: 8px">Installation et premier mois offerts, sans engagement. Votre numéro ne change pas.</p><p style="margin-top: 14px"><a href="/tarifs" class="btn" style="background: #FF6B4A; color: #14213D">Essayer 1 mois offert</a></p></div>
""",
 'faq': [
  ("Combien de clients perd-on avec les appels manqués ?", "Cela dépend de votre métier et de votre volume d'appels. Le calculateur de Tarrelo vous donne une estimation à partir de vos propres chiffres."),
  ("Peut-on combiner plusieurs solutions ?", "Oui, et c'est recommandé : un renvoi vers un assistant pour ne rien perdre, et des créneaux de rappel pour traiter les demandes qui demandent votre expertise."),
  ("Est-ce compatible avec mon téléphone actuel ?", "Oui. Le renvoi d'appel fonctionne sur tous les mobiles et la plupart des lignes fixes, sans application à installer."),
 ],
},
]

def faq_html(faq):
    items = ''.join('<details style="border-bottom: 1px solid #E8DFD3"><summary style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 0; font-size: 18px; font-weight: 600; cursor: pointer">' + html.escape(q, quote=False) + '<span class="plus" aria-hidden="true" style="flex: none; font-size: 26px; font-weight: 400; color: #B83A1E">+</span></summary><p style="font-size: 16px; line-height: 1.6; color: #4A5568; padding-bottom: 22px">' + html.escape(a, quote=False) + '</p></details>' for q, a in faq)
    return '<section style="padding: 72px 0"><div class="wrap" style="display: flex; flex-direction: column; gap: 24px; max-width: 860px">\n<h2 class="h2x" style="font-size: 36px; line-height: 1.12; font-weight: 800; letter-spacing: -1px">Questions fréquentes</h2>\n<div style="border-top: 1px solid #E8DFD3">' + items + '</div></div></section>'

for a in ARTICLES:
    url = 'https://tarrelo.com/ressources/' + a['slug']
    s = TPL
    e = lambda t: html.escape(t, quote=True)
    s = re.sub(r'<title>.*?</title>', '<title>' + e(a['seo_title']) + '</title>', s, 1)
    s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + e(a['desc']) + '">', s, 1)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + e(a['title']) + '">', s, 1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="' + e(a['desc']) + '">', s, 1)
    s = s.replace('https://tarrelo.com/ressources/renvoi-appel"', url + '"')
    m = re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', s, re.S)
    ld = json.loads(m.group(1))
    for node in ld['@graph']:
        t = node.get('@type')
        if t == 'BreadcrumbList':
            node['itemListElement'][2].update({'name': a['title'], 'item': url})
        elif t == 'FAQPage':
            node['mainEntity'] = [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': r}} for q, r in a['faq']]
        elif t == 'Article':
            node.update({'headline': a['title'], 'description': a['desc'], 'datePublished': TODAY, 'dateModified': TODAY, 'mainEntityOfPage': url})
    s = s[:m.start()] + '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=2) + '\n</script>' + s[m.end():]
    i, j = s.index('<main id="contenu">'), s.index('</main>')
    main = ('<main id="contenu">\n<article class="wrap prose" style="max-width: 820px; padding-top: 32px; padding-bottom: 56px">\n'
            '<p class="eyebrow">Guide</p><h1 class="h1x" style="font-size: 46px; line-height: 1.08; font-weight: 800; letter-spacing: -1.4px; margin-top: 8px">' + html.escape(a['title'], quote=False) + '</h1>\n'
            '<p style="font-size: 14px; color: #4A5568; margin-top: 12px">Par Elie, fondateur de Tarrelo · Publié le 26 novembre 2026</p>\n'
            + a['body'].strip() + '\n</article>' + faq_html(a['faq']) + '\n')
    s = s[:i] + main + s[j:]
    open('ressources/' + a['slug'] + '.html', 'w', encoding='utf-8').write(s)
    print('ok', a['slug'])

#!/usr/bin/env python3
"""Extract text or layout from a PDF using pdfplumber.

Usage:
  python3 extract_pdf.py --mode text <path-to-pdf>
  python3 extract_pdf.py --mode layout <path-to-pdf>

--mode text:   Returns plain text (existing behaviour).
--mode layout: Returns character-level layout blocks.

Outputs JSON to stdout.
"""

import json
import os
import re
import sys
from collections import Counter

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"error": "pdfplumber not installed", "text": "", "pages": 0, "method": "pdfplumber"}))
    sys.exit(1)


# ── Font mapping ──────────────────────────────────────────────────────────────

def map_pdf_font(fontname: str) -> str:
    name = fontname.lower()
    if any(x in name for x in [
        'times', 'georgia', 'garamond', 'palatino',
        'baskerville', 'caslon', 'playfair', 'lora',
        'merriweather', 'serif',
    ]):
        return 'serif'
    if any(x in name for x in [
        'courier', 'mono', 'consolas', 'menlo',
        'inconsolata', 'source code',
    ]):
        return 'monospace'
    return 'sans-serif'


# ── Post-processing helpers ─────────────────────────────────────────────────────

# Common English words (lowercase).  Used as a dictionary check when deciding
# whether a camelCase boundary is a genuine word-merge (e.g. "NigeriaSeptember")
# or a proper noun / technical term that should be kept intact (e.g. "PostgreSQL",
# "McKinsey", "Salesforce").
# Augmented on startup from the system dictionary when available.
_COMMON_WORDS = {
    # Months & days
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    # Places
    'nigeria', 'lagos', 'london', 'paris', 'berlin', 'tokyo', 'beijing',
    'new', 'york', 'san', 'francisco', 'los', 'angeles', 'chicago', 'houston',
    'united', 'states', 'kingdom', 'canada', 'australia', 'germany', 'france',
    'spain', 'italy', 'china', 'japan', 'india', 'brazil', 'mexico', 'dubai',
    'europe', 'asia', 'africa', 'america', 'boston', 'seattle', 'austin',
    'denver', 'miami', 'atlanta', 'portland', 'phoenix', 'dallas', 'toronto',
    'vancouver', 'sydney', 'melbourne', 'singapore', 'hong', 'kong', 'seoul',
    'moscow', 'amsterdam', 'dublin', 'munich', 'zurich', 'stockholm', 'oslo',
    'capetown', 'nairobi', 'lagos', 'cairo', 'johannesburg', 'accra',
    # Job titles & roles
    'software', 'engineer', 'developer', 'manager', 'director', 'lead',
    'senior', 'junior', 'staff', 'principal', 'chief', 'executive', 'officer',
    'full', 'stack', 'front', 'end', 'back', 'cloud', 'data', 'product',
    'design', 'experience', 'education', 'skills', 'projects',
    'certifications', 'summary', 'professional', 'technical', 'languages',
    'tools', 'practices', 'intern', 'internship', 'assistant', 'associate',
    'coordinator', 'specialist', 'analyst', 'consultant', 'advisor',
    'representative', 'technician', 'supervisor', 'superintendent',
    'president', 'vice', 'trainee', 'fellow', 'volunteer',
    'architect', 'builder', 'developer', 'designer', 'researcher', 'scientist',
    'administrator', 'coordinator', 'facilitator', 'practitioner',
    # Work verbs
    'achieved', 'administered', 'advised', 'analyzed', 'applied', 'approved',
    'assessed', 'assigned', 'assisted', 'authored', 'budgeted', 'calculated',
    'chaired', 'coached', 'collected', 'communicated', 'compiled', 'completed',
    'composed', 'computed', 'conducted', 'consolidated', 'constructed',
    'consulted', 'contracted', 'contributed', 'coordinated', 'counseled',
    'crafted', 'customized', 'delegated', 'demonstrated', 'deployed',
    'devised', 'diagnosed', 'directed', 'documented', 'drafted', 'edited',
    'educated', 'enabled', 'encouraged', 'established', 'evaluated',
    'examined', 'expanded', 'expedited', 'facilitated', 'finalized',
    'financed', 'forecasted', 'formulated', 'fostered', 'generated',
    'handled', 'hired', 'identified', 'illustrated', 'implemented',
    'improved', 'incorporated', 'increased', 'influenced', 'informed',
    'initiated', 'innovated', 'inspected', 'installed', 'instituted',
    'integrated', 'interpreted', 'introduced', 'invented', 'investigated',
    'launched', 'lectured', 'licensed', 'logged', 'maintained', 'mentored',
    'modeled', 'modified', 'monitored', 'motivated', 'negotiated', 'nurtured',
    'observed', 'obtained', 'operated', 'orchestrated', 'ordered', 'organized',
    'originated', 'outperformed', 'oversaw', 'performed', 'persuaded',
    'piloted', 'pioneered', 'pinpointed', 'prepared', 'presented', 'processed',
    'procured', 'produced', 'programmed', 'projected', 'promoted',
    'proofread', 'proposed', 'protected', 'provided', 'publicized',
    'published', 'purchased', 'qualified', 'questioned', 'realized',
    'received', 'recognized', 'recommended', 'reconciled', 'recorded',
    'recruited', 'rectified', 'redesigned', 'reduced', 'referred',
    'regulated', 'rehabilitated', 'reinforced', 'reorganized', 'repaired',
    'replaced', 'reported', 'represented', 'researched', 'resolved',
    'responded', 'restored', 'retrieved', 'revamped', 'reviewed', 'revised',
    'revitalized', 'scheduled', 'screened', 'selected', 'shaped', 'solved',
    'spearheaded', 'stimulated', 'strategized', 'streamlined', 'strengthened',
    'structured', 'succeeded', 'summarized', 'supervised', 'supplied',
    'supported', 'surpassed', 'synthesized', 'tabulated', 'tested', 'trained',
    'transcribed', 'transferred', 'transformed', 'translated',
    'troubleshot', 'tutored', 'upgraded', 'upheld', 'utilized', 'validated',
    'wrote',
    # Departments & fields
    'marketing', 'sales', 'finance', 'operations', 'human', 'resources',
    'healthcare', 'hospital', 'medical', 'clinical', 'patient', 'surgery',
    'legal', 'compliance', 'audit', 'risk', 'accounting', 'tax', 'audit',
    'investment', 'banking', 'trading', 'portfolio', 'equity', 'venture',
    'capital', 'private', 'public', 'corporate', 'strategy', 'consulting',
    'mergers', 'acquisitions', 'underwriting', 'actuarial',
    'nonprofit', 'government', 'education', 'research', 'philanthropy',
    'manufacturing', 'supply', 'chain', 'logistics', 'procurement',
    'retail', 'wholesale', 'consumer', 'brand', 'advertising', 'public',
    'relations', 'communications', 'media', 'publishing', 'broadcasting',
    'hospitality', 'tourism', 'travel', 'transportation', 'aviation',
    'energy', 'utilities', 'mining', 'agriculture', 'real', 'estate',
    'construction', 'architecture', 'engineering',
    # Education
    'university', 'college', 'school', 'academy', 'institute',
    'high', 'bachelor', 'master', 'doctor', 'phd', 'associate',
    'science', 'arts', 'business', 'engineering', 'technology',
    'computer', 'information', 'systems', 'network', 'security',
    'mathematics', 'statistics', 'physics', 'chemistry', 'biology',
    'economics', 'psychology', 'sociology', 'political', 'philosophy',
    'literature', 'history', 'geography', 'language', 'music', 'theatre',
    'cum', 'laude', 'magna', 'summa', 'honors', 'gpa', 'deans', 'list',
    # Companies & brands (common ones)
    'microsoft', 'google', 'amazon', 'apple', 'meta', 'netflix', 'ibm',
    'oracle', 'salesforce', 'adobe', 'intel', 'cisco', 'dell', 'hp',
    'tesla', 'spacex', 'twitter', 'linkedin', 'uber', 'airbnb', 'paypal',
    'stripe', 'square', 'shopify', 'spotify', 'slack', 'zoom', 'dropbox',
    'pinterest', 'snapchat', 'tiktok', 'reddit', 'quora', 'medium',
    'goldman', 'sachs', 'jpmorgan', 'morgan', 'stanley', 'citigroup',
    'bank', 'america', 'wells', 'fargo', 'blackrock', 'vanguard',
    'fidelity', 'charles', 'schwab', 'pwc', 'deloitte', 'ey', 'kpmg',
    'mckinsey', 'bain', 'boston', 'consulting', 'booz', 'allen',
    'accenture', 'cognizant', 'infosys', 'tcs', 'wipro',
    'walgreens', 'cvs', 'johnson', 'johnson', 'pfizer', 'moderna',
    'novartis', 'roche', 'merck', 'gsk',
    # Infrastructure & tech
    'azure', 'cloud', 'docker', 'kubernetes', 'linux', 'windows',
    'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'ci', 'cd',
    'api', 'rest', 'graphql', 'sql', 'nosql', 'microservices',
    'serverless', 'container', 'orchestration', 'monitoring',
    # General words commonly seen in resumes
    'about', 'above', 'across', 'after', 'again', 'against', 'almost',
    'alone', 'along', 'already', 'also', 'although', 'always', 'among',
    'another', 'anyone', 'anything', 'around', 'because', 'before',
    'behind', 'below', 'beneath', 'beside', 'better', 'between', 'beyond',
    'coming', 'during', 'either', 'enough', 'everything', 'everyone',
    'following', 'further', 'getting', 'giving', 'however', 'inside',
    'itself', 'keeping', 'latest', 'leaving', 'living', 'making',
    'neither', 'nothing', 'noticed', 'obtain', 'offered', 'opening',
    'outside', 'owning', 'placed', 'planning', 'playing', 'pulling',
    'pushing', 'putting', 'raising', 'reading', 'receiving', 'recent',
    'records', 'region', 'related', 'remains', 'removed', 'reports',
    'require', 'results', 'running', 'saving', 'saying', 'school',
    'second', 'sector', 'secure', 'seeing', 'served', 'service',
    'serving', 'settled', 'several', 'shaped', 'shared', 'showed',
    'showing', 'signal', 'signed', 'simple', 'simply', 'single',
    'sister', 'sitting', 'situated', 'slightly', 'social', 'solely',
    'solved', 'sorting', 'source', 'southern', 'speaking', 'special',
    'specific', 'spoken', 'spread', 'spring', 'square', 'stable',
    'staged', 'stakes', 'standard', 'standing', 'started', 'stating',
    'station', 'status', 'stayed', 'staying', 'stemmed', 'stepped',
    'stored', 'straight', 'strange', 'stream', 'street', 'strict',
    'strike', 'strong', 'strongly', 'structure', 'student', 'studies',
    'studios', 'studying', 'subject', 'submit', 'subsequent',
    'substance', 'succeed', 'success', 'suffered', 'sufficient',
    'suggested', 'suitable', 'summer', 'sunset', 'supplied', 'support',
    'supposed', 'surefire', 'surface', 'surplus', 'survive', 'suspect',
    'sustained', 'symbol', 'systems', 'tackled', 'taking', 'talking',
    'target', 'tasked', 'taught', 'teaming', 'tearing', 'telling',
    'tended', 'tension', 'testing', 'thankful', 'theatre', 'theft',
    'themselves', 'theoretical', 'therapy', 'thereafter', 'thereby',
    'thickest', 'thinking', 'thorough', 'thought', 'threaten',
    'thriving', 'throughout', 'throwing', 'tighter', 'timeline',
    'timetable', 'together', 'tomorrow', 'tonight', 'topping',
    'totaled', 'totally', 'touched', 'toughest', 'towards', 'tracking',
    'trading', 'trained', 'training', 'transfers', 'traveled',
    'treading', 'treasure', 'treated', 'tremendous', 'trending',
    'trialed', 'trigger', 'trimmed', 'troubled', 'trusting', 'turning',
    'typical', 'ultimate', 'unable', 'unanimous', 'unaware', 'uncertain',
    'unclear', 'uncommon', 'uncover', 'underlying', 'understand',
    'undertaken', 'underway', 'undoubtedly', 'unexpected', 'unfair',
    'unfortunate', 'uniform', 'unified', 'unique', 'universal',
    'unknown', 'unlikely', 'unnecessary', 'unprecedented', 'unreal',
    'unrelated', 'unreliable', 'unusual', 'upcoming', 'updated',
    'upfront', 'upgrade', 'upheld', 'uphold', 'upholding', 'uplifting',
    'upper', 'upright', 'uproar', 'upscale', 'upset', 'upward',
    'urban', 'urgent', 'useful', 'useless', 'user', 'usual', 'utilize',
    'utmost', 'utter', 'vacant', 'vacation', 'vague', 'valid', 'valuable',
    'value', 'vanished', 'variable', 'varied', 'variety', 'various',
    'varying', 'vast', 'vehicle', 'venture', 'verbal', 'verify',
    'version', 'versus', 'vertical', 'vibrant', 'victim', 'victory',
    'viewing', 'village', 'violate', 'virtual', 'visible', 'vision',
    'visual', 'vital', 'vivid', 'voice', 'volume', 'voluntary',
    'vulnerable', 'waiting', 'walking', 'wandering', 'wanting',
    'warmest', 'warning', 'warrant', 'wary', 'watching', 'wearing',
    'website', 'wedding', 'weekend', 'weekly', 'weighing', 'welcome',
    'welfare', 'western', 'whether', 'whisper', 'whoever', 'wholesale',
    'widespread', 'willing', 'winning', 'winter', 'witness', 'wonder',
    'wooden', 'working', 'worldwide', 'worrying', 'worship', 'worst',
    'worthwhile', 'worthy', 'wrapping', 'writing', 'written', 'wrong',
    'yearly', 'yelling', 'yielding', 'youngest', 'yourself', 'youthful',
    # Numbers
    'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
    'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'twentieth',
    'hundred', 'thousand', 'million', 'billion', 'trillion',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
    'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
    # Common prefixes & suffixes used in company names
    'international', 'incorporated', 'limited', 'corporation', 'company',
    'group', 'holdings', 'partners', 'associates', 'solutions',
    'technologies', 'systems', 'services', 'industries', 'global',
    'north', 'south', 'east', 'west', 'northern', 'southern', 'eastern',
    'western', 'central', 'american', 'european', 'asian', 'pacific',
    'national', 'regional', 'local', 'world', 'worldwide',
    'foundation', 'institute', 'association', 'society', 'council',
    'commission', 'authority', 'agency', 'bureau', 'office',
    'development', 'growth', 'innovation', 'excellence', 'quality',
    'safety', 'security', 'sustainability', 'compliance', 'integrity',
    # Colors & basic adjectives
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'purple',
    'orange', 'brown', 'gray', 'grey', 'gold', 'silver', 'bronze',
    'large', 'small', 'medium', 'major', 'minor', 'primary', 'secondary',
    'active', 'passive', 'positive', 'negative', 'neutral', 'critical',
    'basic', 'advanced', 'simple', 'complex', 'modern', 'classic',
    'common', 'rare', 'unique', 'standard', 'special', 'general',
    'public', 'private', 'internal', 'external', 'local', 'global',
    'daily', 'weekly', 'monthly', 'yearly', 'annual', 'quarterly',
    # Action words (short)
    'act', 'add', 'aid', 'aim', 'ask', 'audit', 'back', 'base', 'bid',
    'book', 'born', 'boss', 'both', 'budget', 'build', 'built', 'burn',
    'buy', 'call', 'camp', 'card', 'care', 'case', 'cash', 'cast',
    'catch', 'cause', 'cell', 'chair', 'chart', 'check', 'chief',
    'claim', 'class', 'clean', 'clear', 'click', 'climb', 'close',
    'code', 'collect', 'commit', 'cover', 'craft', 'create', 'cross',
    'curate', 'cut', 'cycle', 'deal', 'debug', 'define', 'deploy',
    'design', 'detail', 'direct', 'draft', 'draw', 'drive', 'earn',
    'edit', 'enable', 'engage', 'ensure', 'enter', 'establish', 'evolve',
    'exceed', 'execute', 'expand', 'export', 'extend', 'extract',
    'file', 'fill', 'filter', 'finalize', 'find', 'finish', 'fix',
    'focus', 'follow', 'force', 'form', 'format', 'forward', 'free',
    'fulfill', 'fund', 'gain', 'gather', 'generate', 'grow', 'guide',
    'handle', 'hire', 'host', 'identify', 'impact', 'import', 'improve',
    'include', 'increase', 'index', 'inform', 'initiate', 'insert',
    'inspect', 'install', 'integrate', 'interpret', 'introduce',
    'invent', 'invest', 'investigate', 'invite', 'involve', 'join',
    'judge', 'justify', 'keep', 'kick', 'know', 'label', 'launch',
    'lead', 'learn', 'leave', 'lend', 'level', 'leverage', 'license',
    'lift', 'link', 'load', 'loan', 'locate', 'lock', 'log', 'look',
    'lower', 'maintain', 'manage', 'map', 'mark', 'match', 'measure',
    'mentor', 'merge', 'migrate', 'mind', 'model', 'modify', 'monitor',
    'motivate', 'move', 'name', 'navigate', 'need', 'negotiate', 'note',
    'notice', 'notify', 'number', 'obtain', 'offer', 'open', 'operate',
    'optimize', 'order', 'organize', 'outline', 'outsource', 'overcome',
    'overhaul', 'overlook', 'override', 'oversee', 'own', 'pace',
    'pack', 'paint', 'pair', 'parallel', 'partner', 'pass', 'pause',
    'pay', 'penalize', 'perform', 'permit', 'persist', 'pilot', 'pioneer',
    'place', 'plan', 'play', 'plot', 'plug', 'point', 'polish', 'pool',
    'position', 'post', 'power', 'practice', 'praise', 'predict',
    'prefer', 'prepare', 'present', 'preserve', 'press', 'prevent',
    'price', 'print', 'prioritize', 'probe', 'process', 'procure',
    'produce', 'program', 'progress', 'project', 'promote', 'prompt',
    'proofread', 'propose', 'protect', 'prove', 'provide', 'publish',
    'pull', 'purchase', 'pursue', 'push', 'qualify', 'query', 'question',
    'queue', 'quit', 'quote', 'race', 'raise', 'rank', 'rate', 'reach',
    'react', 'read', 'realign', 'realize', 'rebuild', 'receive',
    'recognize', 'recommend', 'reconcile', 'reconsider', 'record',
    'recruit', 'rectify', 'recycle', 'redesign', 'reduce', 'refer',
    'reflect', 'refresh', 'refund', 'refuse', 'regain', 'regard',
    'register', 'regulate', 'reinforce', 'reject', 'relate', 'release',
    'relocate', 'remain', 'remedy', 'remind', 'remove', 'render',
    'renew', 'reorganize', 'repair', 'replace', 'report', 'represent',
    'request', 'require', 'research', 'resolve', 'respond', 'restore',
    'restrict', 'restructure', 'result', 'retain', 'retire', 'retrieve',
    'return', 'reveal', 'review', 'revise', 'revitalize', 'reward',
    'rewrite', 'rid', 'risk', 'role', 'rotate', 'route', 'run',
    'save', 'scale', 'scan', 'schedule', 'score', 'screen', 'script',
    'search', 'secure', 'segment', 'select', 'sell', 'send', 'sense',
    'separate', 'sequence', 'serve', 'service', 'set', 'settle',
    'setup', 'shape', 'share', 'shift', 'ship', 'shorten', 'show',
    'shut', 'sign', 'signal', 'simplify', 'simulate', 'size', 'sketch',
    'skill', 'skip', 'slash', 'sleep', 'slice', 'slide', 'solve',
    'sort', 'source', 'speak', 'specify', 'spend', 'split', 'sponsor',
    'spot', 'spread', 'stabilize', 'staff', 'stage', 'stake', 'standardize',
    'start', 'state', 'station', 'status', 'stay', 'steer', 'step',
    'stimulate', 'stock', 'stop', 'store', 'stream', 'streamline',
    'strengthen', 'stretch', 'strict', 'strike', 'structure', 'study',
    'style', 'submit', 'substitute', 'succeed', 'summarize', 'supply',
    'support', 'surpass', 'survey', 'suspend', 'sustain', 'swap',
    'switch', 'sync', 'synthesize', 'systematize', 'table', 'tabulate',
    'tailor', 'take', 'talk', 'target', 'task', 'teach', 'team', 'test',
    'thank', 'think', 'thrive', 'tie', 'tighten', 'time', 'tip',
    'track', 'trade', 'train', 'transfer', 'transform', 'translate',
    'transmit', 'travel', 'treat', 'trigger', 'trim', 'troubleshoot',
    'trust', 'try', 'tune', 'turn', 'tutor', 'type', 'undergo',
    'undertake', 'unify', 'update', 'upgrade', 'uphold', 'use', 'utilize',
    'validate', 'value', 'vary', 'verify', 'view', 'visit', 'visualize',
    'voice', 'volunteer', 'wait', 'walk', 'warn', 'watch', 'wear',
    'web', 'weigh', 'welcome', 'win', 'wind', 'witness', 'work',
    'worry', 'wrap', 'write', 'yield',
}


def _load_common_words() -> set:
    """Build the common-words set, optionally augmented from the system dictionary."""
    words = set(_COMMON_WORDS)
    try:
        for p in ('/usr/share/dict/words', '/usr/dict/words'):
            if os.path.exists(p):
                with open(p) as f:
                    for line in f:
                        w = line.strip().lower()
                        if len(w) >= 3 and w.isalpha():
                            words.add(w)
                break
    except (OSError, IOError):
        pass
    return words


_COMMON_WORDS_FULL = _load_common_words()


# Compound words that ARE common English words on both sides but
# should NOT be split (false positives for the dictionary check).
_CAMEL_KEEP = {
    # Tech / programming
    "JavaScript", "TypeScript", "WebSocket", "WebSockets", "WebGL",
    "freeCodeCamp", "CodeSandbox", "CodePen", "CodeSignal",
    "PostScript", "PowerPoint", "WordPress",
    "OpenAI", "ChatGPT",
    "GitHub", "GitLab", "GitKraken",
    "YouTube", "YouTuber",
    # Company / product names
    "NotePad", "WordPad", "PaintBrush", "PhotoShop", "LightRoom",
    "SnapChat", "TikTok", "Reddit", "PinInterest",
    "SalesForce", "WorkDay", "DayForce",
    "BlackRock", "BlackStone", "CocaCola", "DunBradstreet",
    "LehmanBrothers", "BearStearns",
    "BankRate", "HomeDepot", "CostCo", "WholeFoods",
    "Fair Isaac", "FICO",
    # Resume-specific
    "WebDesign", "WebDev", "WebApp",
    "FullStack", "FrontEnd", "BackEnd", "BackEnds",
    "NonProfit", "NonProfits",
    "HighSchool", "HighSchools",
    "RealEstate", "RealEstates",
    "SupplyChain", "SupplyChains",
    "HealthCare", "HealthCares",
    "LifeScience", "LifeSciences",
    "DataBase", "DataBases",
    "DataScience", "DataScientist",
    "MachineLearning",
    "DeepLearning",
    "ArtificialIntelligence",
    "NaturalLanguage",
    "ComputerVision",
    "InformationTechnology",
    "InformationSecurity",
    "CyberSecurity",
    "BusinessIntelligence",
    "BusinessDevelopment",
    "BusinessAnalyst",
    "BusinessAnalytics",
    "DataAnalytics",
    "DataVisualization",
    "ProductManagement",
    "ProductManager",
    "ProjectManagement",
    "ProjectManager",
    "ProgramManagement",
    "ProgramManager",
    "EngineeringManager",
    "SoftwareEngineering",
    "SoftwareEngineer",
    "SoftwareDeveloper",
    "FullStackDeveloper",
    "FrontendDeveloper",
    "BackendDeveloper",
    "CloudEngineer",
    "CloudArchitect",
    "DataEngineer",
    "DataArchitect",
    "SolutionArchitect",
    "SolutionsArchitect",
    "SystemArchitect",
    "SystemsArchitect",
    "NetworkEngineer",
    "SecurityEngineer",
    "DevOpsEngineer",
    "SiteReliability",
    "SiteReliabilityEngineer",
    "StaffEngineer",
    "PrincipalEngineer",
    "DistinguishedEngineer",
    "FellowEngineer",
    "ResearchScientist",
    "AppliedScientist",
    "DataScientist",
    "MachineLearningEngineer",
    "DeepLearningEngineer",
    "ComputerVisionEngineer",
    "NaturalLanguageProcessing",
    # Misc compounds
    "HighLevel", "LowLevel",
    "BestPractice", "BestPractices",
    "StateOfTheArt",
    "CuttingEdge",
    "GroundUp",
    "EndToEnd",
    "TopTier",
    "FirstTier",
    "SecondTier",
    "ThirdTier",
    "FirstHand",
    "HandsOn",
    "FollowUp",
    "FollowUp",
    "SetUp", "StartUp", "StartUps",
    "LogIn", "SignIn", "LogOut", "SignOut",
    "CheckIn", "CheckOut", "CheckList", "CheckLists",
    "TimeLine", "TimeLines",
    "TimeFrame", "TimeFrames",
    "TimeSheet", "TimeSheets",
    "WorkFlow", "WorkFlows",
    "WorkLoad", "WorkLoads",
    "WorkPlace", "WorkPlaces",
    "WorkSpace", "WorkSpaces",
    "LifeCycle", "LifeCycles",
    "RoadMap", "RoadMaps",
    "PipeLine", "PipeLines",
    "OutPut", "OutPuts",
    "InPut", "InPuts",
    "TurnOver", "TurnOvers",
    "TakeOver", "TakeOvers",
    "HandOver", "HandOvers",
    "MakeOrBuy",
    "BuildOrBuy",
}


def fix_merged_words(text: str) -> str:
    """Fix common PDF extraction issues where words are merged.

    Uses a dictionary-based approach to distinguish genuine word merges
    (like ``NigeriaSeptember`` → ``Nigeria September``) from proper nouns /
    technical terms that should stay intact (like ``PostgreSQL``, ``Salesforce``).
    Preserves existing line breaks (``\n``) in the input.
    """
    lines = text.split('\n')
    fixed_lines = []
    for line in lines:
        # Apply comma-merge fix per line
        line = re.sub(r'([a-zA-Z]),([a-zA-Z])', r'\1, \2', line)
        # Apply camelCase fix per line
        parts = line.split()
        fixed_parts = []
        for part in parts:
            stem = part.rstrip('.,!?:;)]}>')
            if not stem or not stem[0].isupper() or not stem.isalpha() or not re.search(r'[a-z][A-Z]', stem):
                fixed_parts.append(part)
                continue
            if stem in _CAMEL_KEEP:
                fixed_parts.append(part)
                continue
            trailing = part[len(stem):]
            fragments = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', stem).split()
            if all(len(f) >= 3 and f.lower() in _COMMON_WORDS_FULL for f in fragments):
                fixed_parts.append(' '.join(fragments) + trailing)
            else:
                fixed_parts.append(part)
        fixed_lines.append(' '.join(fixed_parts))
    return '\n'.join(fixed_lines)


# ── Text width estimation ─────────────────────────────────────────────────────

# Per-character width factors (as fraction of fontSize) for a standard
# sans-serif font — used to estimate the minimum block width needed
# so text doesn't wrap when rendered with our Google Font replacements.
_CHAR_WIDTHS = {
    'A': 0.67, 'B': 0.62, 'C': 0.62, 'D': 0.64, 'E': 0.58, 'F': 0.55,
    'G': 0.63, 'H': 0.67, 'I': 0.33, 'J': 0.52, 'K': 0.60, 'L': 0.55,
    'M': 0.78, 'N': 0.67, 'O': 0.65, 'P': 0.58, 'Q': 0.65, 'R': 0.60,
    'S': 0.58, 'T': 0.55, 'U': 0.64, 'V': 0.60, 'W': 0.82, 'X': 0.60,
    'Y': 0.58, 'Z': 0.55,
    'a': 0.52, 'b': 0.54, 'c': 0.48, 'd': 0.54, 'e': 0.52, 'f': 0.32,
    'g': 0.52, 'h': 0.54, 'i': 0.26, 'j': 0.26, 'k': 0.50, 'l': 0.26,
    'm': 0.80, 'n': 0.54, 'o': 0.50, 'p': 0.54, 'q': 0.54, 'r': 0.36,
    's': 0.48, 't': 0.36, 'u': 0.54, 'v': 0.48, 'w': 0.68, 'x': 0.48,
    'y': 0.48, 'z': 0.48,
    '0': 0.55, '1': 0.33, '2': 0.55, '3': 0.55, '4': 0.58,
    '5': 0.55, '6': 0.55, '7': 0.52, '8': 0.55, '9': 0.55,
    ' ': 0.30, '.': 0.28, ',': 0.28, '|': 0.24, '(': 0.36, ')': 0.36,
    '@': 0.65, '!': 0.28, '+': 0.55, '-': 0.35, '/': 0.40, ':': 0.28,
    ';': 0.28, "'": 0.20, '"': 0.40, '#': 0.60, '$': 0.55, '%': 0.65,
    '&': 0.60, '*': 0.45, '=': 0.55, '?': 0.50, '_': 0.50, '~': 0.55,
    '>': 0.55, '<': 0.55, '[': 0.36, ']': 0.36, '{': 0.36, '}': 0.36,
    '\\': 0.40, '^': 0.45, '`': 0.20,
}


def estimate_text_width(text: str, font_size: float, font_weight: int, is_all_caps: bool) -> float:
    lines = text.split('\n')
    bold_factor = 1.15 if font_weight >= 600 else 1.0
    caps_factor = 1.15 if is_all_caps else 1.0
    max_width = 0.0
    for line in lines:
        if not line:
            continue
        line_width = 0.0
        for ch in line:
            factor = _CHAR_WIDTHS.get(ch, 0.50)
            line_width += factor
        line_width *= font_size * bold_factor * caps_factor
        max_width = max(max_width, line_width)
    return max_width


# ── Mode helpers ──────────────────────────────────────────────────────────────

def mode_text(path: str) -> dict:
    with pdfplumber.open(path) as pdf:
        pages = len(pdf.pages)
        texts = []
        for page in pdf.pages:
            page_text = page.extract_text(layout=True) or ""
            texts.append(page_text)
        full_text = "\f".join(texts)
        return {"text": full_text, "pages": pages, "method": "pdfplumber"}


def mode_layout(path: str) -> dict:
    with pdfplumber.open(path) as pdf:
        doc_pages = []
        all_font_sizes = []

        for page_num, page in enumerate(pdf.pages, start=1):
            width = float(page.width)
            height = float(page.height)

            chars = page.chars
            if not chars:
                doc_pages.append({
                    "pageNumber": page_num,
                    "width": width,
                    "height": height,
                    "blocks": [],
                })
                continue

            # Collect all font sizes for median computation
            all_font_sizes.extend(c.get("size", 0) or 0 for c in chars)

            # Use pdfplumber's extract_words for reliable word boundaries
            raw_words = page.extract_words() or []
            if not raw_words:
                doc_pages.append({
                    "pageNumber": page_num,
                    "width": width,
                    "height": height,
                    "blocks": [],
                })
                continue

            # Build word objects with text from pdfplumber + char data for font info
            def chars_for_word(w):
                return [c for c in chars
                        if c["x0"] >= w["x0"] - 1 and c["x1"] <= w["x1"] + 1
                        and abs(c["top"] - w["top"]) < 3]

            words = [{"text": w["text"], "x0": w["x0"], "x1": w["x1"],
                       "top": w["top"], "bottom": w["bottom"],
                       "chars": chars_for_word(w)} for w in raw_words]

            def word_top(w):
                return min(c["top"] for c in w["chars"]) if w["chars"] else w["top"]

            # Group words into lines (y0 within 2px)
            lines = []
            current_line = [words[0]]
            for w in words[1:]:
                prev_w = current_line[-1]
                if abs(word_top(w) - word_top(prev_w)) < 2:
                    current_line.append(w)
                else:
                    lines.append(current_line)
                    current_line = [w]
            lines.append(current_line)

            # Compute per-line metadata for heading detection
            line_sizes = []
            line_fonts = []
            for line in lines:
                all_chars = sum((w["chars"] for w in line), [])
                sizes = [c.get("size", 10) or 10 for c in all_chars]
                fonts = [c.get("fontname", "") or "" for c in all_chars]
                line_sizes.append(max(sizes) if sizes else 10)
                line_fonts.append(Counter(fonts).most_common(1)[0][0] if fonts else "")

            def is_heading_line(i):
                font_lower = line_fonts[i].lower()
                is_bold = any(x in font_lower for x in ["semibold", "bold", "medium", "black", "heavy"])
                size = line_sizes[i]
                prev_size = line_sizes[i - 1] if i > 0 else 0
                next_size = line_sizes[i + 1] if i < len(line_sizes) - 1 else 0
                size_spike = (prev_size > 0 and size / prev_size > 1.25) or (next_size > 0 and size / next_size > 1.25)
                return is_bold or size_spike

            # Output each line as its own absolutely-positioned block
            output_blocks = []
            for li, line in enumerate(lines):
                words_text = [w["text"] for w in line]
                line_text = fix_merged_words(" ".join(words_text)).strip()
                if not line_text:
                    continue
                line_chars = sum((w["chars"] for w in line), [])

                x0 = min(w["x0"] for w in line)
                x1 = max(w["x1"] for w in line)
                y0 = min(c["top"] for c in line_chars) if line_chars else min(w["top"] for w in line)
                y1 = max(c["bottom"] for c in line_chars) if line_chars else max(w["bottom"] for w in line)

                sizes_on_line = [c.get("size", 10) or 10 for c in line_chars]
                size_counts = Counter(sizes_on_line)
                dom_size = size_counts.most_common(1)[0][0] if size_counts else 10

                fontnames_on_line = [c.get("fontname", "") or "" for c in line_chars]
                fontname_counts = Counter(fontnames_on_line)
                dominant_font = fontname_counts.most_common(1)[0][0] if fontname_counts else ""

                font_family = map_pdf_font(dominant_font)
                fontname_lower = dominant_font.lower()
                if any(x in fontname_lower for x in ["black", "heavy"]):
                    font_weight = 900
                elif "semibold" in fontname_lower:
                    font_weight = 600
                elif "medium" in fontname_lower:
                    font_weight = 500
                elif "bold" in fontname_lower:
                    font_weight = 700
                else:
                    font_weight = 400
                font_style = "italic" if any(x in fontname_lower for x in ["italic", "oblique"]) else "normal"

                # Color
                color_objs = [c.get("non_stroking_color") for c in line_chars if c.get("non_stroking_color")]
                if color_objs:
                    color = color_objs[0]
                    if isinstance(color, (list, tuple)) and len(color) >= 3:
                        r = max(0, min(255, round(color[0] * 255)))
                        g = max(0, min(255, round(color[1] * 255)))
                        b = max(0, min(255, round(color[2] * 255)))
                        css_color = f"rgb({r},{g},{b})"
                    else:
                        css_color = "rgb(0,0,0)"
                else:
                    css_color = "rgb(0,0,0)"

                is_all_caps = False
                alpha_chars = [c for c in line_text if c.isalpha()]
                if len(alpha_chars) > 2 and all(c.isupper() for c in alpha_chars):
                    is_all_caps = True

                block_height = y1 - y0

                pdf_width = x1 - x0
                estimated_width = estimate_text_width(line_text, dom_size, font_weight, is_all_caps)
                max_allowed = width - x0
                block_width = min(max(pdf_width, estimated_width), max_allowed)

                is_heading = is_heading_line(li)
                is_caps_short = is_all_caps and len(line_text) < 40

                output_blocks.append({
                    "id": f"p{page_num}_l{li}",
                    "text": line_text,
                    "x": round(x0, 2),
                    "y": round(y0, 2),
                    "width": round(block_width, 2),
                    "height": round(block_height, 2),
                    "fontSize": round(dom_size, 1),
                    "fontWeight": font_weight,
                    "fontStyle": font_style,
                    "fontFamily": font_family,
                    "color": css_color,
                    "isAllCaps": is_all_caps,
                    "isLikelyHeading": is_heading or is_caps_short,
                    "lineCount": 1,
                    "lineHeight": None,
                })

            # Extract decorations (lines, rects) from the PDF page
            decorations = []
            for line_obj in page.lines or []:
                r, g, b = (line_obj.get("stroking_color") or (0, 0, 0))
                if isinstance(r, float):
                    lr = max(0, min(255, round(r * 255)))
                    lg = max(0, min(255, round(g * 255)))
                    lb = max(0, min(255, round(b * 255)))
                    lcolor = f"rgb({lr},{lg},{lb})"
                else:
                    lcolor = "rgb(0,0,0)"
                decorations.append({
                    "type": "line",
                    "x": round(line_obj["x0"], 2),
                    "y": round(line_obj["top"], 2),
                    "width": round(line_obj["x1"] - line_obj["x0"], 2),
                    "height": round(line_obj.get("linewidth", 1), 2),
                    "color": lcolor,
                })
            for rect in page.rects or []:
                fill_col = rect.get("non_stroking_color")
                stroke_col = rect.get("stroking_color")
                dec = {"type": "rect", "x": round(rect["x0"], 2), "y": round(rect["top"], 2),
                       "width": round(rect["x1"] - rect["x0"], 2),
                       "height": round(rect["bottom"] - rect["top"], 2)}
                if fill_col and isinstance(fill_col, (list, tuple)) and len(fill_col) >= 3:
                    fr = max(0, min(255, round(fill_col[0] * 255)))
                    fg = max(0, min(255, round(fill_col[1] * 255)))
                    fb = max(0, min(255, round(fill_col[2] * 255)))
                    dec["fill"] = f"rgb({fr},{fg},{fb})"
                if stroke_col and isinstance(stroke_col, (list, tuple)) and len(stroke_col) >= 3:
                    sr = max(0, min(255, round(stroke_col[0] * 255)))
                    sg = max(0, min(255, round(stroke_col[1] * 255)))
                    sb = max(0, min(255, round(stroke_col[2] * 255)))
                    dec["stroke"] = f"rgb({sr},{sg},{sb})"
                    dec["strokeWidth"] = round(rect.get("linewidth", 0), 2)
                if fill_col or stroke_col:
                    decorations.append(dec)

            doc_pages.append({
                "pageNumber": page_num,
                "width": round(width, 2),
                "height": round(height, 2),
                "blocks": output_blocks,
                "decorations": decorations,
            })

        # Dominant font across entire document
        if all_font_sizes:
            font_size_counts = Counter(all_font_sizes)
            dom_size = font_size_counts.most_common(1)[0][0]
        else:
            dom_size = 10

        # Count families across all blocks
        all_families = []
        for pg in doc_pages:
            for b in pg["blocks"]:
                all_families.append(b["fontFamily"])
        family_counts = Counter(all_families) if all_families else Counter({"sans-serif": 1})
        dom_family = family_counts.most_common(1)[0][0]

        return {
            "pages": doc_pages,
            "dominantFontSize": round(dom_size, 1),
            "dominantFontFamily": dom_family,
            "pageCount": len(doc_pages),
        }


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python3 extract_pdf.py --mode text|layout <path-to-pdf>",
        }))
        sys.exit(1)

    mode = sys.argv[1]
    path = sys.argv[2]

    if mode != "--mode" or len(sys.argv) < 3:
        print(json.dumps({"error": "Expected --mode flag as first argument"}))
        sys.exit(1)

    mode_value = sys.argv[2]
    pdf_path = sys.argv[3] if len(sys.argv) > 3 else ""

    if not pdf_path:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    try:
        if mode_value == "text":
            result = mode_text(pdf_path)
        elif mode_value == "layout":
            result = mode_layout(pdf_path)
        else:
            result = {"error": f"Unknown mode: {mode_value}"}
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

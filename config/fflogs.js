const fflogsConfig = {
    BASE_REGION_GAME_VERSION: {
        'global': '5.4',
        'korea': '5.3',
    },
    BASE_REGION_I18N: {
        'global': ['na', 'jp', 'fr'],
        'korea': ['kr'],
    },
    BASE_REGION_SERVERS: {
        'global': [
            // JA
            'aegis', 'atomos', 'carbuncle', 'garuda', 'gungnir', 'kujata', 'ramuh', 'tonberry', 'typhon', 'unicorn',
            'alexander', 'bahamut', 'durandal', 'fenrir', 'ifrit', 'ridill', 'tiamat', 'ultima', 'valefor', 'yojimbo', 'zeromus',
            'anima', 'asura', 'belias', 'chocobo', 'hades', 'ixion', 'mandragora', 'masamune', 'pandaemonium', 'shinryu', 'titan',
            // NA
            'adamantoise', 'cactuar', 'faerie', 'gilgamesh', 'jenova', 'midgardsormr', 'sargatanas', 'siren',
            'behemoth', 'excalibur', 'exodus', 'famfrit', 'hyperion', 'lamia', 'leviathan', 'ultros',
            'balmung', 'brynhildr', 'coeurl', 'diabolos', 'goblin', 'malboro', 'mateus', 'zalera',
            // EU
            'cerberus', 'louisoix', 'moogle', 'omega', 'ragnarok', 'spriggan',
            'lich', 'odin', 'phoenix', 'shiva', 'twintania', 'zodiark',
        ],
        'korea': ['carbuncle', 'moogle', 'chocobo', 'tonberry'],
    },
    BASE_RAIDTYPES: {
        'dungeon': 1,
        'raid': 3,
        '24raid': 4,
        'trial': 3,
        'trial_unreal': 3,
        'ultimate': 3,
    },
    BASE_DEFAULT_CATEGORIES: {
        'dungeon': {
            'global': 27,   // Dungeons (Endgame)
            'korea': 27,    // Dungeons (Endgame)
        },
        'raid': {
            'global': 38,   // Eden's Promise
            'korea': 38,    // Eden's Verse
        },
        '24raid': {
            'global': 35,   // The Puppets' Bunker
            'korea': 35,    // The Copied Factory
        },
        'trial': {
            'global': 37,   // Trials III (Extreme)
            'korea': 34,    // Trials II (Extreme)
        },
        'trial_unreal': {
            'global': 36,   // Trials (Unreal)
            'korea': 36,    // Trials (Unreal)
        },
        'ultimate': {
            'global': 32,   // Ultimates
            'korea': 32,    // Ultimates
        },
    },
};

module.exports = fflogsConfig;

const fflogsConfig = {
    BASE_REGION_GAME_VERSION: {
        'global': '5.4',
        'korea': '5.2',
    },
    BASE_REGION_I18N: {
        'global': ['na', 'jp', 'fr'],
        'korea': ['kr'],
    },
    BASE_REGION_SERVERS: {
        'global': [
            // JA
            'Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Ramuh', 'Tonberry', 'Typhon', 'Unicorn',
            'Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima', 'Valefor', 'Yojimbo', 'Zeromus',
            'Anima', 'Asura', 'Belias', 'Chocobo', 'Hades', 'Ixion', 'Mandragora', 'Masamune', 'Pandaemonium', 'Shinryu', 'Titan',
            // NA
            'Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren',
            'Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros',
            'Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera',
            // EU
            'Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Ragnarok', 'Spriggan',
            'Lich', 'Odin', 'Phoenix', 'Shiva', 'Twintania', 'Zodiark',
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
            'korea': 33,    // Eden's Verse
        },
        '24raid': {
            'global': 35,   // The Puppets' Bunker
            'korea': 31,    // The Copied Factory
        },
        'trial': {
            'global': 37,   // Trials III (Extreme)
            'korea': 37,    // Trials III (Extreme)
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
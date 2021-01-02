const Categories = {
    Global: {
        topics: {
            name: 'Topics',
            url: '/lodestone/topics',
            link: '/lodestone/topics',
            icon: 'http://na.lodestonenews.com/images/topics.png',
            thumbnail: 'http://na.lodestonenews.com/images/thumbnail.png',
            color: 14258475,
        },
        notices: {
            name: 'Notices',
            url: '/lodestone/news/category/1',
            link: '/lodestone/news/category/1',
            icon: 'http://na.lodestonenews.com/images/notices.png',
            color: 13421772,
        },
        maintenance: {
            name: 'Maintenance',
            url: '/lodestone/news/category/2',
            link: '/lodestone/news/category/2',
            icon: 'http://na.lodestonenews.com/images/maintenance.png',
            color: 13413161,
        },
        updates: {
            name: 'Updates',
            url: '/lodestone/news/category/3',
            link: '/lodestone/news/category/3',
            icon: 'http://na.lodestonenews.com/images/updates.png',
            color: 7051581,
        },
        status: {
            name: '',
            url: '/lodestone/news/category/4',
            link: '/lodestone/news/category/4',
            icon: 'http://na.lodestonenews.com/images/status.png',
            color: 10042685,
        },
        developers: {
            name: `Developers' Blog`,
            url: '/pr/blog/atom.xml',
            link: '/pr/blog/',
            icon: 'http://na.lodestonenews.com/images/developers.png',
            color: 6737151,
        },
    },
    Korea: {
        notices: {
            name: '공지',
            url: '/news/notice?category=1',
            link: '/news/notice?category=1',
            icon: 'http://na.lodestonenews.com/images/notices.png',
            color: 13421772,
        },
        maintenance: {
            name: '점검',
            url: '/news/notice?category=2',
            link: '/news/notice?category=2',
            icon: 'http://na.lodestonenews.com/images/maintenance.png',
            color: 13413161,
        },
        updates: {
            name: '업데이트',
            url: '/news/notice?category=3',
            link: '/news/notice?category=3',
            icon: 'http://na.lodestonenews.com/images/updates.png',
            color: 7051581,
        },
        // 색과 아이콘 수정해야함
        event: {
            name: '이벤트',
            url: '/news/event',
            link: '/news/event',
            icon: 'http://na.lodestonenews.com/images/developers.png',
            color: 6737151,
        },
        patchnote: {
            name: '업데이트 노트',
            url: '/news/patchnote',
            link: '/news/patchnote',
            icon: 'http://na.lodestonenews.com/images/developers.png',
            color: 6737151,
        },
    }
};

module.exports = Categories;
"use strict";
// Github profile info
//{
//    provider: 'github',
//        id: 4118690,
//    displayName: 'Daniel Kostro',
//    username: 'stropitek',
//    profileUrl: 'https://github.com/stropitek',
//    emails: [ { value: 'kostro.d@gmail.com' } ],
//    _raw: '{"login":"stropitek","id":4118690,"avatar_url":"https://avatars.githubusercontent.com/u/4118690?v=3","gravatar_id":"","url":"https://api.github.com/users/stropitek","html_url":"https://github.com/stropitek","followers_url":"https://api.github.com/users/stropitek/followers","following_url":"https://api.github.com/users/stropitek/following{/other_user}","gists_url":"https://api.github.com/users/stropitek/gists{/gist_id}","starred_url":"https://api.github.com/users/stropitek/starred{/owner}{/repo}","subscriptions_url":"https://api.github.com/users/stropitek/subscriptions","organizations_url":"https://api.github.com/users/stropitek/orgs","repos_url":"https://api.github.com/users/stropitek/repos","events_url":"https://api.github.com/users/stropitek/events{/privacy}","received_events_url":"https://api.github.com/users/stropitek/received_events","type":"User","site_admin":false,"name":"Daniel Kostro","company":null,"blog":null,"location":"Geneva, Lausanne","email":"kostro.d@gmail.com","hireable":true,"bio":null,"public_repos":12,"public_gists":0,"followers":0,"following":0,"created_at":"2013-04-10T19:09:53Z","updated_at":"2015-03-03T15:53:48Z"}',
//    _json:
//    {
//        login: 'stropitek',
//        id: 4118690,
//        avatar_url: 'https://avatars.githubusercontent.com/u/4118690?v=3',
//        gravatar_id: '',
//        url: 'https://api.github.com/users/stropitek',
//        html_url: 'https://github.com/stropitek',
//        followers_url: 'https://api.github.com/users/stropitek/followers',
//        following_url: 'https://api.github.com/users/stropitek/following{/other_user}',
//        gists_url: 'https://api.github.com/users/stropitek/gists{/gist_id}',
//        starred_url: 'https://api.github.com/users/stropitek/starred{/owner}{/repo}',
//        subscriptions_url: 'https://api.github.com/users/stropitek/subscriptions',
//        organizations_url: 'https://api.github.com/users/stropitek/orgs',
//        repos_url: 'https://api.github.com/users/stropitek/repos',
//        events_url: 'https://api.github.com/users/stropitek/events{/privacy}',
//        received_events_url: 'https://api.github.com/users/stropitek/received_events',
//        type: 'User',
//        site_admin: false,
//        name: 'Daniel Kostro',
//        company: null,
//        blog: null,
//        location: 'Geneva, Lausanne',
//        email: 'kostro.d@gmail.com',
//        hireable: true,
//        bio: null,
//        public_repos: 12,
//        public_gists: 0,
//        followers: 0,
//        following: 0,
//        created_at: '2013-04-10T19:09:53Z',
//        updated_at: '2015-03-03T15:53:48Z'
//    }
//}

var GitHubStrategy = require('passport-github').Strategy;


module.exports = {};

module.exports.init = function(passport, router, config) {
    passport.use(new GitHubStrategy({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            callbackURL: config.proxy + config.callbackURL
        },
        function(accessToken, refreshToken, profile, done) {
            console.log(profile);
            done(null, profile);
        }
    ));

    router.get(config.loginURL, passport.authenticate('github'));

    router.get(config.callbackURL,
        passport.authenticate('github', { failureRedirect: config.failureRedirect }),
        function*() {
            // Successful authentication, redirect home.
            this.response.redirect(config.successRedirect);
        });
};
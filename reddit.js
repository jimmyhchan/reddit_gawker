/* RedditCloner
 * A class which creates a cloned version of reddit using reddit's JSONP api 
 * repsonses coming back from reddit are shoved into a haml.js templates 
 * which are AJAX'd in.  the styled data are plopped into elements of the page. 
 *
 * script: RedditCloner.js
 * author: jimmy h chan  jimmyhchan@gmail.com
 * license: MIT style license 
 * requires: mootools, Request.JSONP, HAML  (from haml-js)
 * also requires (but shouldn't be):  Fx.Scroll, Spinner, Date
 * provides:  RedditCloner
 * 
 * usage: 
 *   include the required files
 *  <script src="https://ajax.googleapis.com/ajax/libs/mootools/1.3.0/mootools-yui-compressed.js"></script>
 *  <script src="js/mylibs/request.jsonp.js" type="text/javascript" charset="utf-8"></script>
 *  <script src="js/mylibs/fx.scroll.js" type="text/javascript" charset="utf-8"></script>
 *  <script src="js/mylibs/spinner.js" type="text/javascript" charset="utf-8"></script>
 *  <script src="haml.js"></script>
 *  <script src="RedditCloner.js"></script>
 * note:
 *   the haml files are AJAX'd in from the current domain. 
 *   if you are testing without a server..well you cant'...
 *   you'll need an apache server so that the haml files are grabbed
 *  
 *  
 *
 *   init a redditCloner and get the current page
 *   window.addEvent('domready', function(){
 *       var r = new RedditCloner();
 *       r.getCurrentPage();
 *   }
 *   
 *   
*/
var RedditCloner = new Class ({
    Implements: [Events, Options],
    options: {
        baseUrl: 'http://www.reddit.com/',
        urlSuffix: '.json',
        callbackKey:'jsonp',
        templatePath: '',
    /*templates should probably be converted to :
     * naming convention:
     *     
     * (for each region in )
     *  homepage
     *    - fireEvent('beforeinsertT3(location)') 
     *    - t3.before.(location)?.haml
     *    - t3.content.(location)?.haml
     *    - t3.after.(location)?.haml
     *    - fireEvent('afterinsertT3(location)') 
     *  permalink
     *    - fireEvent('beforeinsertT1(location)') 
     *    - t1.before.(location)?.haml
     *    - t1.content.(location)?.haml
     *    - t1.after.(location)?.haml
     *    - reply.before.(location)?.haml
     *    - reply.content.(location)?.haml
     *    - reply.after.(location)?.haml
     *    - more.before.(location)?.haml
     *    - more.content.(location)?.haml
     *    - more.after.(location)?.haml
     *    - fireEvent('afterinsertT1(location)') 
     */
        homepageRegions: [
            {   
                containerId: 'main_content',
                template: 'home.main.haml'
            },
            {  
                containerId: 'sidebar_content',
                template: 'home.sidebar.haml'
            }
        ],
        subRedditPageRegions: [
            {   
                containerId: 'main_content',
                template: 'home.main.haml'
            },
            {  
                containerId: 'sidebar_content',
                template: 'home.sidebar.haml'
            }
        ],
        permalinkPageRegions: [
            {   
                containerId: 'main_content',
                permalinkTemplate: 'permalinkPost.main.haml',
                repliesTemplate: 'reply.main.haml'
            }
        ],
        subRedditsRegions: [
            {   
                containerId: 'subReddits',
                template: 'subreddits_nav.all.haml'
            }
        ]
    },
    initialize: function(options){
        this.setOptions(options);
        this.pageSpinner = new Spinner();
    },
    sendRequest: function(url, data, responseHandler){
        var thisClass = this;
        new Request.JSONP({
            url: this.options.baseUrl+url+this.options.urlSuffix,
            data: data || {},
            callbackKey: this.options.callbackKey,
            onRequest: function(){
                thisClass.pageSpinner.show();
            },
            onComplete: function(response){
                responseHandler(response);
                thisClass.pageSpinner.hide();
            },
            onCancel: function(response){
                thisClass.pageSpinner.hide();
            },
            onTimeout: function(response){
                thisClass.pageSpinner.hide();
            }
        }).send();
    },
    getTemplate: function(templateName){
        var templateString = '';
        new Request({
            url: templateName, 
            async: false, // is this necessary?
            onSuccess: function(response){
                templateString = response;
            }
        }).send();
        return templateString;
    },
    getHashLink: function(link){
        var pattern = /#\!([^?#]*)/;
        link = (link)?link: window.location.href;
        if (link.match(pattern)){
            return link.match(pattern)[1];
        }else{
            return 'r/all/';
        }
    },
    getParams: function(link){
        var pattern = /#\![^#]*\?([^#]*)/;
        link = (link)?link: window.location.href;
        if (link.match(pattern)){
            return link.match(pattern)[1];
        }else{
            return '';
        }
    },
    renderRegion: function(regionsList, data){
        var thisClass = this;
        Array.each(regionsList, function(region){
            var tpl = Haml(thisClass.getTemplate(region.template));
            document.id(region.containerId).set('html', tpl(data));
            thisClass.initInternalLinks(region.containerId);
            thisClass.initPostTime(region.containerId);
        });
    },
    initInternalLinks: function(regionId){
                           //TODO: move this to an onAfterTemplate Insert event
        //add events to links in the given region so that are handled 
        var container = document.id(regionId);
        if (container === null){
            return;
        }
        var thisClass = this;
        Array.each(container.getElements('.internalLink'), function(int_link){
            int_link.addEvent('click', function(e){
                e.stop();
                window.location.hash = e.target.getProperty('href');
                thisClass.getCurrentPage();
            });
        });
    },
    initPostTime: function(regionId){
                           //TODO: move this to an onAfterTemplate Insert event
        //add events to links in the given region so that are handled 
        var container = document.id(regionId);
        if (container === null){
            return;
        }
        Array.each(container.getElements('.postTime'), function(postTime){
            utcPostTime = postTime.get('text')+'000';// reddit doesn't save millisecs
            d = new Date(utcPostTime.toInt());
            //see moo-more's date
            //we just need the hour ... yeah
            postTime.set('text', d.format('%I:00 %p'));
        });
    },
    initSortLinks: function(regionId){
       // adds a sort and gets new content 
        var container = document.id(regionId);
        if (container === null){
            return;
        }
        var thisClass = this;
        Array.each(container.getElements('.sortLink'), function(sort_link){
            sort_link.addEvent('click', function(e){
                e.stop();
                e.target.getParent().getElement('.active').removeClass('active');
                e.target.addClass('active');
                //parameters are defined in the link 
                //remove the initial ./
                var sortParams = e.target.get('href').slice(2);
                var currentHash = thisClass.getHashLink();
                currentHash = currentHash.match(/(r\/[\w]*\/?)/)[1];
                window.location.hash = '!'+currentHash+ sortParams;
                thisClass.getCurrentPage();
            });
        });
    }
    ,
    getCurrentPage: function(){
        var currentHash = this.getHashLink();
        var currentParams = this.getParams();
        //internal subreddit links
        var subRedditPattern = /r\/(\w*)\/?(\w*)?\/?$/;
        var permalinkPattern = /(r\/\w*\/comments.*)/;
        if (currentHash.match(subRedditPattern)){
            var sr = currentHash.match(subRedditPattern)[1];
            var sr_filter = currentHash.match(subRedditPattern)[2];
            this.getSubRedditPage(sr, sr_filter, currentParams);
        }else if (currentHash.match(permalinkPattern)){
        //internal permalink links  ... this needs to be better!!
            var pl = currentHash.match(permalinkPattern)[1];
            this.getPermalinkPage(pl, currentParams);
        }
        // TODO: user page
    },
    getHomePage: function(params){
        this.sendRequest('', params, this.handleHomepageResponse.bind(this));
        console.log('homepage loaded ');
    },
    handleHomepageResponse: function(response){
        if (response.kind && response.kind == "Listing"){
            this.renderRegion(this.options.homepageRegions, response.data);
        }
    },
    getSubRedditPage: function(subReddit, subRedditFilter, params){
        var url = 'r/'+subReddit;
        if (subRedditFilter){
            url += '/'+subRedditFilter+'/';
        }
        this.sendRequest(url, params, this.handleSubRedditResponse.bind(this));
        $$('.currentSubReddit').set('text',subReddit);
        console.log('subreddit '+ url +' loaded');
    },
    handleSubRedditResponse: function(response){
        if (response.kind && response.kind == "Listing"){
            this.renderRegion(this.options.subRedditPageRegions, response.data);
        }
    },
    getPermalinkPage: function(permalink, params){
        params = params || {sort:'hot'};
        this.sendRequest(permalink, params, this.handlePermalinkResponse.bind(this));
        console.log('permalink '+ permalink +' loaded');
    },
    handlePermalinkResponse: function(response){
        if (response){
            //permalink responds with 2 objects: one containing the t3 post and the other the
            //t1 comments:  t1 posts are nest and sometimes has a more link
            //pass the a hash with the full response to the template
            //
            //render region won't work for the recursion: this.renderRegion(this.options.permalinkPageRegions, {response:response});
            //duplicate it for now clean it up soon TODO
            //need to generalize this or the renderRegions method
            //
            //objects with kind Listing 
            //objects with kind T5
            //objects with kind T3
            //objects with kind T1
            //objects with kind more
            var thisClass = this;
            var postInfo = response[0];
            var repliesInfo = response[1];
            var repliesTpl = Haml(thisClass.getTemplate(this.options.permalinkPageRegions[0].repliesTemplate));
            var permalinkTpl = Haml(thisClass.getTemplate(this.options.permalinkPageRegions[0].permalinkTemplate));
            var rendered = '';
            rendered += permalinkTpl(postInfo);
            function renderReply (repliesInfo){
                if (repliesInfo.data === null){
                    //we need data 
                    console.log('no data');
                }else if (repliesInfo.kind == "Listing"){
                    // step through the listing branches recursively
                    Array.each(repliesInfo.data.children, function(child){
                        renderReply(child);
                    });
                }else if (repliesInfo.kind == 't1'){
                    // walk on the stem 
                    rendered += repliesTpl(repliesInfo);
                    //rendered += repliesInfo.data.body;
                    //and look for branches
                    if (repliesInfo.data.replies){
                        rendered += '<div class="reply">\n';
                        renderReply(repliesInfo.data.replies);
                        rendered += '</div>\n';
                    }else{
                    //or leaves
                    }
                }else if (repliesInfo.kind == "more"){
                    //a very short branch 
                    rendered += "more "+ repliesInfo.data.name;
                }else{
                    console.log('no data');
                }
            };
            /*
            function renderReply (repliesInfo){
                rendered += repliesTpl(repliesInfo.data.children[0]);
                if (repliesInfo.data.children[0].data.replies){
                    renderReply(repliesInfo.data.children[0].data.replies);
                }
            }*/
            renderReply(repliesInfo);
            document.id(this.options.permalinkPageRegions[0].containerId).set('html', rendered);
            thisClass.initInternalLinks(this.options.permalinkPageRegions[0].containerId);
            thisClass.initPostTime(this.options.permalinkPageRegions[0].containerId);
        }
    },
    getSubreddits: function(){
        this.sendRequest('reddits/', {}, this.handleSubredditsResponse.bind(this));
    },
    handleSubredditsResponse: function(response){
        if (response.kind && response.kind == "Listing"){
            this.renderRegion(this.options.subRedditsRegions, response.data);
        }
    }
});



// hello({"kind": "Listing", "data": {"modhash": "", "children": [{"kind": "t3", "data": {"domain": "i.imgur.com", "media_embed": {}, "levenshtein": null, "subreddit": "pics", "selftext_html": null, "selftext": "", "likes": null, "saved": false, "id": "fkjgn", "clicked": false, "author": "PrimaxAUS", "media": null, "score": 661, "over_18": false, "hidden": false, "thumbnail": "http://thumbs.reddit.com/t3_fkjgn.png", "subreddit_id": "t5_2qh0u", "downs": 1134, "is_self": false, "permalink": "/r/pics/comments/fkjgn/im_just_in_it_for/", "name": "t3_fkjgn", "created": 1297629894.0, "url": "http://i.imgur.com/XDGSW.jpg", "title": "I'm just in it for...", "created_utc": 1297604694.0, "num_comments": 210, "ups": 1795}}, {"kind": "t3", "data": {"domain": "nytimes.com", "media_embed": {}, "levenshtein": null, "subreddit": "worldnews", "selftext_html": null, "selftext": "", "likes": null, "saved": false, "id": "fkhhd", "clicked": false, "author": "jewiscool", "media": null, "score": 1176, "over_18": false, "hidden": false, "thumbnail": "", "subreddit_id": "t5_2qh13", "downs": 1357, "is_self": false, "permalink": "/r/worldnews/comments/fkhhd/egypt_americans_scorn_aljazeera_but_it_playd/", "name": "t3_fkhhd", "created": 1297614119.0, "url": "http://www.nytimes.com/2011/02/13/opinion/13kristof.html?_r=2", "title": "Egypt: Americans scorn AlJazeera but it playd greater role in promoting democracy in Arab world than anything US did", "created_utc": 1297588919.0, "num_comments": 406, "ups": 2533}}], "after": "t3_fkhhd", "before": null}})

window.addEvent('domready', function(){
    var r = new RedditCloner();
    r.getCurrentPage();
    r.getSubreddits();

    //initialize the sort links in the sidebar
    r.initSortLinks('sidebar');
    location.href.match(/[^#]*\?([^#]*)/);
    //sidebar fixed position but scrollable WOW!
    var sidebarScrollFx = new Fx.Scroll('sidebar_content_wrapper');
    var scrollDelta = 250;
    $$('#sidebar_bottom_thingy_that_makes_no_sense .sidebar_scroll_down').addEvent('click', function(e){
        e.stop();
        sidebarScrollFx.start(0, $('sidebar_content_wrapper').getScroll().y + scrollDelta);
    });
    $$('#sidebar_bottom_thingy_that_makes_no_sense .sidebar_scroll_up').addEvent('click', function(e){
        e.stop();
        sidebarScrollFx.start(0, $('sidebar_content_wrapper').getScroll().y - scrollDelta);
    });
});

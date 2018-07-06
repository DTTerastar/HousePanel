// jquery functions to do Ajax on housepanel.php
// old style setup of tabs to support maximum browsers
var popupStatus = 0;
var popupCell = null;
var popupSave = "";
var popupRoom = "";
var popupVal = 0;
var modalStatus = 0;
var priorOpmode = "Operate";
var returnURL = "housepanel.php";
var dragZindex = 1;
var hpconfig;

// Store
// localStorage.setItem("lastname", "Smith");
// Retrieve
// document.getElementById("result").innerHTML = localStorage.getItem("lastname");

Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

function setCookie(cname, cvalue, exdays) {
    if ( !exdays ) exdays = 30;
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

window.addEventListener("load", function(event) {

    // set the global return URL value
    try {
        returnURL = $("input[name='returnURL']").val();
    } catch(e) {
        returnURL = "housepanel.php";
    }
    
    // get options file and push it to php or if not there
    // ask the server to create a default config
    if (typeof(Storage) !== "undefined" ) {
        
        // if ( localStorage.getItem("housepanelconfig") )
        try {
            hpconfig = getConfig();
            console.log("Retrieved configuration from local storage");
        } catch(e) {
            hpconfig = "none";
            console.log("Local storage not found. Performing new authorization." );
        }
    } else {
        hpconfig = null;
        alert("HousePanel will not run on this Browser because it does not support Local Storage.");
        console.log("HousePanel will not run on this Browser because it does not support Local Storage." );
        return;
    }
    
    // grab the coonfiguration parameters from our webpage
    var configpage = $("input[name='configpage']");
    
    // main page push is here
    var protloop = getCookie("protloop");
    if ( protloop === "" ) { protloop = "0"; }
    protloop = parseInt(protloop, 10);
    
    if ( configpage && configpage.val()=="operate" ) {
        console.log ("hpconfig before sync:");
        console.log(hpconfig);
        $.post(returnURL, 
            {useajax: "hpconfig", id: 1, type: "config", value: "none", attr: hpconfig},
            function (presult, pstatus) {
                if (pstatus==="success" && presult["status"]==="success") {
                    setConfig(presult["hpconfig"]);
                    console.log ("hpconfig after sync:");
                    console.log(hpconfig);
                    if ( presult["reload"]==="true" && protloop < 2) {
                        protloop = protloop + 1;
                        setCookie("protloop",protloop,1);
                        window.location.href = returnURL;
                    } else {
                        setCookie("protloop",0,1);
                    }
                } else {
                    setCookie("protloop",0,1);
                    alert("HousePanel could not find or create a valid coonfiguration");
                    return;
                }
            }, "json"
        );
    } else {
        setCookie("protloop",0,1);
    }

    // this will only happen when authorization page is used
    if ( configpage && configpage.val()==="configure" ) {
        configPage();
        setTimeout(function() {
            window.location.href = returnURL;
        }, 3000);
    }
    
    if ( configpage && configpage.val()=="showoptions" ) {
        setupFilters();
        setupSaveButton();
    }
    
    if ( configpage && configpage.val()=="operate" ) {
        
        $( "#tabs" ).tabs();
    
    // get default tab from cookie
        var defaultTab = getCookie( 'defaultTab' );
        if ( defaultTab ) {
            try {
                $("#"+defaultTab).click();
            } catch (e) {}
        }

        // hide the skin and 
        $("div.skinoption").hide();

        // setup page clicks
        setupPage();

        // disable return key
        $("form.options").keypress(function(e) {
            if ( e.keyCode===13  && popupStatus===1){
                processPopup();
                return false;
            }
            else if (e.keyCode===13) {
                return false;
            } else if ( e.keyCode===27 && popupStatus===1 ){
                disablePopup();
            }
        });

        getMaxZindex();

        // set up popup editing - disabled because it is broken
        // setupPopup();

        // set up option box clicks
        setupFilters();

        setupButtons();

        // setupSaveButton();

        setupSliders();

        // setup click on a page
        // this appears to be painfully slow so disable
        setupTabclick();

        setupColors();

        // invoke the new timer that updates everything at once
        // disable these if you want to minimize cloud web traffic
        // if you do this manual controls will not be reflected in panel
        // but you can always run a refresh to update the panel manually
        // or you can run it every once in a blue moon too
        // any value less than 5000 (5 sec) will be interpreted as never
        // allTimerSetup(60000);
        // allHubitatSetup(5000);

        cancelDraggable();
        cancelSortable();
        cancelPagemove();
    }
});

function publishConfig() {
    hpconfig = getConfig();
    console.log ("hpconfig before sync:");
    console.log(hpconfig);
    $.post(returnURL, 
        {useajax: "hpconfig", id: 1, type: "config", value: "none", attr: hpconfig},
        function (presult, pstatus) {
            if (pstatus==="success" && presult["status"]==="success") {
                hpconfig = setConfig(presult["hpconfig"]);
                console.log ("hpconfig after sync:");
                console.log(hpconfig);
            }
        }, "json"
    );
    
}

function rgb2hsv(r, g, b) {
     //remove spaces from input RGB values, convert to int
     var r = parseInt( (''+r).replace(/\s/g,''),10 ); 
     var g = parseInt( (''+g).replace(/\s/g,''),10 ); 
     var b = parseInt( (''+b).replace(/\s/g,''),10 ); 

    if ( r==null || g==null || b==null ||
         isNaN(r) || isNaN(g)|| isNaN(b) ) {
        return {"hue": 0, "saturation": 0, "level": 0};
    }
    
    if (r<0 || g<0 || b<0 || r>255 || g>255 || b>255) {
        return {"hue": 0, "saturation": 0, "level": 0};
    }
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
    h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }
    h = Math.floor(h * 100);
    s = Math.floor(s * 100);
    v = Math.floor(v * 100);

    return {"hue": h, "saturation": s, "level": v};
}

function getMaxZindex() {
    dragZindex = 2;
    $("div.panel div.thing").each( function() {
        var zindex = $(this).css("z-index");
        if ( zindex ) {
            zindex = parseInt(zindex);
            if ( zindex > dragZindex ) { dragZindex = zindex; }
        }
    });
}

function convertToModal(modalcontent) {
    modalcontent = modalcontent + '<div class="modalbuttons"><button name="okay" id="modalokay" class="dialogbtn okay">Okay</button>';
    modalcontent = modalcontent + '<button name="cancel" id="modalcancel" class="dialogbtn cancel">Cancel</button></div>';
    return modalcontent;
}

function createModal(modalcontent, modaltag, addok,  pos, responsefunction, loadfunction) {
    var modalid = "modalid";
    
    // skip if a modal is already up...
    if ( modalStatus ) { return; }
    var modaldata = modalcontent;
    var modalhook;
    
    if ( modaltag && typeof modaltag === "object" && modaltag.hasOwnProperty("attr") ) {
//        alert("object");
        modalhook = modaltag;
    } else if ( modaltag && typeof modaltag === "string" ) {
//        alert("string: "+modaltag);
        modalhook = $(modaltag)
    } else {
//        alert("default body");
        modalhook = $("body");
    }
    var styleinfo = "";
    if ( pos ) {
        styleinfo = " style=\"position: absolute; left: " + pos.left + "px; top: " + pos.top + "px;\"";
    }
    
    modalcontent = "<div id='" + modalid +"' class='modalbox'" + styleinfo + ">" + modalcontent;
    if ( addok ) {
        modalcontent = convertToModal(modalcontent);
    }
    modalcontent = modalcontent + "</div>";
    
    // console.log(modalcontent);
    modalhook.prepend(modalcontent);
    modalStatus = 1;
    
    // call post setup function if provided
    if ( loadfunction ) {
        loadfunction(modalhook, modaldata);
    }

    // invoke response to click
    if ( addok ) {
        $("#"+modalid).on("click",".dialogbtn", function(evt) {
            // alert("clicked on button");
            modalStatus = 0;
            if ( responsefunction ) {
                responsefunction(this, modaldata);
            }
            closeModal();
        });
    } else {
        $("body").on("click",function(evt) {
            if ( evt.target.id === modalid ) {
                evt.stopPropagation();
                return;
            } else {
                closeModal();
                if ( responsefunction ) {
                    responsefunction(evt.target, modaldata);
                }
            }
        });
        
    }
    
}

function closeModal() {
    $("#modalid").remove();
    modalStatus = 0;
}

function setupColors() {
    
   $("div.overlay.color >div.color").each( function() {
        var that = $(this);
        $(this).minicolors({
            position: "bottom left",
            defaultValue: $(this).html(),
            theme: 'default',
            change: function(hex) {
                try {
                    // console.log( "color: " + hex + " = " + $(this).minicolors("rgbaString") );
                    that.html(hex);
                    var aid = that.attr("aid");
                    that.css({"background-color": hex});
                    var huetag = $("#a-"+aid+"-hue");
                    var sattag = $("#a-"+aid+"-saturation");
                    if ( huetag ) { huetag.css({"background-color": hex}); }
                    if ( sattag ) { sattag.css({"background-color": hex}); }
                } catch(e) {}
            },
            hide: function() {
                var newcolor = $(this).minicolors("rgbObject");
                var hsl = rgb2hsv( newcolor.r, newcolor.g, newcolor.b );
                var hslstr = "hsl("+hsl.hue.pad(3)+","+hsl.saturation.pad(3)+","+hsl.level.pad(3)+")";
                var aid = that.attr("aid");
                var tile = '#t-'+aid;
                var bid = $(tile).attr("bid");
                var bidupd = bid;
                var thetype = $(tile).attr("type");
                var ajaxcall = "doaction";
                if ( bid.startsWith("h_") ) {
                    ajaxcall = "dohubitat";
                    bid = bid.substring(2);
                }
//                 alert("posting change to color= hsl= " + hslstr + " bid= " + bid);
                $.post(returnURL, 
                       {useajax: ajaxcall, id: bid, type: thetype, value: hslstr, attr: "color"},
                       function (presult, pstatus) {
                            if (pstatus==="success" ) {
                                updAll("color",aid,bidupd,thetype,presult);
                            }
                       }, "json"
                );
            }
        });
    });   
}

function setupSliders() {
    
    // $("div.overlay.level >div.level").slider( "destroy" );
    $("div.overlay.level >div.level").slider({
        orientation: "horizontal",
        min: 0,
        max: 100,
        step: 5,
        stop: function( evt, ui) {
            var thing = $(evt.target);
            thing.attr("value",ui.value);
            
            var aid = thing.attr("aid");
            var tile = '#t-'+aid;
            var bid = $(tile).attr("bid");
            var bidupd = bid;
            var ajaxcall = "doaction";
            var subid = thing.attr("subid");
            var thevalue = parseInt(ui.value);
            if ( bid.startsWith("h_") ) {
                ajaxcall = "dohubitat";
                bid = bid.substring(2);
            }
            var thetype = $(tile).attr("type");
            console.log(ajaxcall + " : id= "+bid+" type= "+thetype+ " subid= " + subid + " value= "+thevalue);
            
            // handle music volume different than lights
            if ( thetype != "music") {
                $.post(returnURL, 
                       {useajax: ajaxcall, id: bid, type: thetype, value: thevalue, attr: "level", subid: subid},
                       function (presult, pstatus) {
                            if (pstatus==="success" ) {
                                console.log( ajaxcall + " POST returned: "+ strObject(presult) );
                                updAll("slider",aid,bidupd,thetype,presult);
                            }
                       }, "json"
                );
            } else {
                $.post(returnURL, 
                       {useajax: ajaxcall, id: bid, type: thetype, value: thevalue, attr: "level", subid: subid},
                       function (presult, pstatus) {
                            if (pstatus==="success" ) {
                                console.log( ajaxcall + " POST returned: "+ strObject(presult) );
                                updateTile(aid, presult);
                            }
                       }, "json"
                );
                
            }
        }
    });

    // set the initial slider values
    $("div.overlay.level >div.level").each( function(){
        var initval = $(this).attr("value");
        // alert("setting up slider with value = " + initval);
        $(this).slider("value", initval);
    });

    // now set up all colorTemperature sliders
    // $("div.overlay.colorTemperature >div.colorTemperature").slider( "destroy" );
    $("div.overlay.colorTemperature >div.colorTemperature").slider({
        orientation: "horizontal",
        min: 2000,
        max: 7400,
        step: 200,
        stop: function( evt, ui) {
            var thing = $(evt.target);
            thing.attr("value",ui.value);
            
            var aid = thing.attr("aid");
            var tile = '#t-'+aid;
            var bid = $(tile).attr("bid");
            var bidupd = bid;
            var ajaxcall = "doaction";
            if ( bid.startsWith("h_") ) {
                ajaxcall = "dohubitat";
                bid = bid.substring(2);
            }
            var thetype = $(tile).attr("type");
            
            $.post(returnURL, 
                   {useajax: ajaxcall, id: bid, type: thetype, value: parseInt(ui.value), attr: "colorTemperature" },
                   function (presult, pstatus) {
                        if (pstatus==="success" ) {
                            console.log( ajaxcall + " POST returned: "+ strObject(presult) );
                            updAll("slider",aid,bidupd,thetype,presult);
                        }
                   }, "json"
            );
        }
    });

    // set the initial slider values
    $("div.overlay.colorTemperature >div.colorTemperature").each( function(){
        var initval = $(this).attr("value");
        // alert("setting up slider with value = " + initval);
        $(this).slider("value", initval);
    });
    
}

function cancelDraggable() {
    $("div.panel div.thing").each(function(){
        if ( $(this).draggable("instance") ) {
            $(this).draggable("destroy");
            
            // remove the position so color swatch stays on top
            if ( $(this).css("left")===0 || $(this).css("left")==="" ) {
                $(this).css("position","");
            }
        }
    });
    
    if ( $("div.panel").droppable("instance") ) {
        $("div.panel").droppable("destroy");
    }

    if ( $("#catalog").droppable("instance") ) {
        $("#catalog").droppable("destroy");
    }
    
    // $("#catalog").hide();
    // remove the catalog
    $("#catalog").remove();
}

function cancelSortable() {
    $("div.panel").each(function(){
        if ( $(this).sortable("instance") ) {
            $(this).sortable("destroy");
        }
    });
}

function cancelPagemove() {
//    $("ul.ui-tabs-nav").each(function(){
//        if ( $(this).sortable("instance") ) {
//            $(this).sortable("destroy");
//        }
//    });
    if ( $("#roomtabs").sortable("instance") ) {
        $("#roomtabs").sortable("destroy");
    }
}

function setupPagemove() {
    
    // make the room tabs sortable
    // the change function does a post to make it permanent
    $("#roomtabs").sortable({
        axis: "x", 
        items: "> li",
        cancel: "li.nodrag",
        opacity: 0.5,
        containment: "ul.ui-tabs-nav",
        delay: 200,
        revert: false,
        update: function(event, ui) {
            var pages = {};
            var k = 0;
            // get the new list of pages in order
            // fix nasty bug to correct room tab move
            $("#roomtabs >li.ui-tab").each(function() {
                // changed this to use the class to get the original room name
                // instead of the text which can be the custom name
                // var pagename = $(this).text();
                var pagename = $(this).attr("class");
                pagename = pagename.substring(4);
                pages[pagename] = k;
                k++;
            });
            hpconfig = getConfig();
            $.post(returnURL, 
                {useajax: "pageorder", id: "none", type: "rooms", value: pages, attr: hpconfig},
                function (presult, pstatus) {
                    if (pstatus==="success" && presult["status"]==="success") {
                        console.log("Reordered page tabs");
                        setConfig(presult["hpconfig"]);
                    }
                }, "json"
            );
        }
    });
}

function setupSortable() {

    $("div.panel").sortable({
        containment: "parent",
        scroll: true,
        items: "> div",
        delay: 50,
        grid: [1, 1],
        stop: function(event, ui) {
            var roomtitle = $(ui.item).attr("panel");
            var things = [];
            $("div.thing[panel="+roomtitle+"]").each(function(){
                var thingobj = {tile: $(this).attr("tile"), zindex: $(this).attr("zindex"), custom: $(this).attr("custom")}
                things.push( thingobj );
                // things.push($(this).attr("tile"));
            });
            hpconfig = getConfig();
            $.post(returnURL, 
                {useajax: "pageorder", id: "none", type: "things", value: things, subid: roomtitle,  attr: hpconfig},
                function (presult, pstatus) {
                    if (pstatus==="success" && presult["status"]==="success") {
                        console.log("Reordered tiles on page: " + roomtitle);
                        setConfig(presult["hpconfig"]);
                    }
                }, "json"
            );
        }
    });
        
    
}

var startPos = {top: 0, left: 0, zindex: 0};
function thingDraggable(thing) {
    thing.draggable({
        revert: "invalid",
        // containment: "#dragregion",
        start: function(evt, ui) {
            startPos.left = $(evt.target).css("left");
            startPos.top = $(evt.target).css("top");
            
            startPos.zindex = $(evt.target).css("z-index");
            if ( !startPos.zindex || !parseInt(startPos.zindex) ) {
                startPos.zindex = 2;
            }
            console.log("Starting drag top= "+startPos.top+" left= "+startPos.left+" z= "+startPos.zindex);
            
            // while dragging make sure we are on top
            $(evt.target).css("z-index", 9999);
        }
    });
    
//    var styleinfo = " style=\"position: absolute; left: 1px; top: 1px;\"";
//    var editdiv = "<div class=\"editlink\" aid=" + thing.attr("id") + styleinfo  + ">[E]</div>";
//    thing.append(editdiv);
}

function setupDraggable() {

    // get the catalog content and insert after main tabs content
    var xhr = $.post(returnURL, 
        {useajax: "getcatalog", id: 0, type: "catalog", value: "none", attr: hpconfig},
        function (presult, pstatus) {
            if (pstatus==="success" && presult["status"]==="success") {
                console.log("Displaying catalog");
                $("#tabs").after(presult["thing"]);
            }
        }, "json"
    );
    
    // if we failed clean up
    xhr.fail( cancelDraggable );
    
    // enable filters and other stuff if successful
    xhr.done( function() {
        
        $("#catalog").draggable();
        
        setupFilters();

        // show the catalog
        $("#catalog").show();

        // the active things on a panel
        thingDraggable( $("div.panel div.thing") );
    
        // enable dropping things from the catalog into panel
        // and movement of existing things around on the panel itself
        // use this instead of stop method to deal with cancelling drops
        $("div.panel").droppable({
            accept: function(thing) {
                var accepting = false;
                if ( thing.hasClass("thing") && modalStatus===0 ) {
                    accepting = true;
                }
                return accepting;
            },
            tolerance: "fit",
            drop: function(event, ui) {
                var thing = ui.draggable;
                var bid = $(thing).attr("bid");
                var tile = $(thing).attr("tile");
                var thingtype = $(thing).attr("type");
                var thingname = $(thing).find(".thingname").text();
                // var thingname = $("span.orignal.n_"+tile).html();

                // handle new tile creation
                if ( thing.hasClass("catalog-thing") ) {
                    // get panel of active page - have to do this the hard way
                    // because the thing in the catalog doesn't have a panel attr
                    $("li.ui-tabs-tab").each(function() {
                        if ( $(this).hasClass("ui-tabs-active") ) {
                            var panel = $(this).text();
                            var lastthing = $("div.panel-"+panel+" div.thing").last();
                            var pos = {left: 400, top: 100};
                            createModal("Add: "+ thingname + " of Type: "+thingtype+" to Room: "+panel+"?<br />Are you sure?","body", true, pos, function(ui, content) {
                                var clk = $(ui).attr("name");
                                if ( clk==="okay" ) {
                                    // add it to the system
                                    // the ajax call must return a valid "div" block for the dragged new thing

                                    // get the last thing in the current room
                                    // var lastthing = $("div.panel-"+panel+" div.thing").last();
                                    var cnt = $("div.panel div.thing").last().attr("id");
                                    cnt = parseInt(cnt.substring(2),10) + 1;
                                    hpconfig = getConfig();
                                    console.log("hpconfig before add: ");
                                    console.log(hpconfig);
                                    // alert("bid= " + bid + " type= " + thingtype + " panel= "+panel+ " cnt= " + cnt + " after id= " + lastthing.attr("id") + 
                                    //       " name= " + thingname + " hpconfig keys= " + strObject(Object.keys(hpconfig)) );
                                    $.post(returnURL, 
                                        {useajax: "dragmake", id: bid, type: thingtype, value: panel, tile: cnt, attr: hpconfig},
                                        function (presult, pstatus) {
                                            console.log("presult after add:");
                                            console.log(presult);
                                            if (pstatus==="success" && presult["status"]==="success" ) {
                                                console.log( "Added " + thingname + " of type " + thingtype + " to room " + panel + " thing= "+ presult["thing"] );
                                                lastthing.after(presult["thing"]);
                                                setConfig(presult["hpconfig"]);
                                                var newthing = lastthing.next();
                                                dragZindex = dragZindex + 1;
                                                $(newthing).css( {"z-index": dragZindex.toString()} );
                                                thingDraggable( newthing );
                                                setupPage();
                                                setupSliders();
                                                setupColors();
                                            } else {
                                                console.log("Failed to make thing. pstatus = " + pstatus + " presult status = " + presult["status"]);
                                            }
                                        }, "json"
                                    );
                                }
                            });
                        } 
                    });
                // otherwise this is an existing thing we are moving
                } else {
                    var dragthing = {};
                    dragthing["id"] = $(thing).attr("id");
                    dragthing["tile"] = tile;
                    dragthing["panel"] = $(thing).attr("panel");
                    var customname = $("span.customname.m_"+tile).html();
                    if ( !customname ) { customname = ""; }
                    dragthing["custom"] = customname;
                    dragZindex = parseInt(dragZindex,10);
                    
                    if ( !startPos.zindex ) {
                        startPos.zindex = 2;
                    }
                    if ( startPos.zindex < dragZindex ) { 
                        startPos.zindex = dragZindex + 1; 
                    }
                    dragZindex = startPos.zindex;
                    
                    // make this sit on top
                    dragthing["zindex"] = startPos.zindex;
                    $(thing).css( {"z-index": startPos.zindex.toString()} );
                    
                    // alert("Stopped drag: z-index= " + startPos.zindex.toString() );

                    // now post back to housepanel to save the position
                    // also send the dragthing object to get panel name and tile pid index
                    // we use subid to pass position now so attr can be used for standard options
                    if ( ! $("#catalog").hasClass("ui-droppable-hover") ) {
                        hpconfig = getConfig();
                        console.log( "Moved " + customname + " to top: "+ ui.position.top + ", left: " + ui.position.left + ", z: " + dragZindex );
                        $.post(returnURL, 
                            {useajax: "dragdrop", id: bid, type: thingtype, value: dragthing, subid: ui.position, attr: hpconfig},
                            function (presult, pstatus) {
                                if (pstatus==="success" && presult["status"]==="success") {
                                    setConfig(presult["hpconfig"]);
                                    console.log( "Moved tile: "+ $(thing).html() );
                                }
                            }, "json"
                        );
                    }

                }
            }
        });

        // enable dragging things from catalog
        $("#catalog div.thing").draggable({
            revert: false,
            // containment: "#dragregion",
            helper: "clone"
        });

        // enable dropping things from panel into catalog to remove
        $("#catalog").droppable({
            accept: "div.panel div.thing",
    //        accept: function(thing) {
    //            var accepting = false;
    //            if ( thing.hasClass("panel") && modalStatus===0 ) {
    //                accepting = true;
    //            }
    ////            alert("modalStatus = " + modalStatus);
    //            return accepting;
    //        },
            tolerance: "fit",
            drop: function(event, ui) {
                var thing = ui.draggable;
                var bid = $(thing).attr("bid");
                var thingtype = $(thing).attr("type");
                // easy to get panel of active things
                var panel = $(thing).attr("panel");
                var id = $(thing).attr("id");
                var tile = $(thing).attr("tile");
                // var tilename = $("#s-"+aid).text();
                var tilename = $("span.original.n_"+tile).html();
                var pos = {top: 100, left: 10};

                createModal("Remove: "+ tilename + " of type: "+thingtype+" from room "+panel+"? Are you sure?", "body" , true, pos, function(ui, content) {
                    var clk = $(ui).attr("name");
                    if ( clk=="okay" ) {
                        // remove it from the system
                        // alert("Removing thing = " + tilename);
                        hpconfig = getConfig();
                        $.post(returnURL, 
                            {useajax: "dragdelete", id: bid, type: thingtype, value: panel, tile: tile, attr: hpconfig},
                            function (presult, pstatus) {
                                console.log("ajax call: status = " + pstatus + " result = "+presult);
                                if (pstatus==="success" && presult["status"]==="success") {
                                    setConfig(presult["hpconfig"]);
                                    console.log( "Removed tile: "+ $(thing).html() );
                                    // remove it visually
                                    $(thing).remove();
                                } else {
                                    console.log("Failed to remove tile. pstatus = " + pstatus + " rstatus = " + presult["status"]);
                                }
                            }
                        );

                    // even though we did a successful drop, revert to original place
                    } else {
                        // $("#"+id).data('draggable').options.revert();
                        try {
                            $(thing).css("position","relative").css("left",startPos.left).css("top",startPos.top);
                            $(thing).css( {"z-index": startPos.zindex.toString()} );
                        } catch(e) { 
                            alert("Drag/drop error. Please share this with @kewashi on the ST Community Forum: " + e.message); 
                        }
                    }
                });
            }
        });
    
    });
}

function getConfig() {
    var contents = localStorage.getItem("housepanelconfig");
    return JSON.parse(contents);
}

function setConfig(config) {
    hpconfig = config;
    localStorage.setItem("housepanelconfig", JSON.stringify(hpconfig));
    return hpconfig;
}

// rewrite this to do a real Ajax post so we can send and return options
function dynoForm(ajaxcall, content, idval, typeval) {
    idval = idval ? idval : 0;
    typeval = typeval ? typeval : "none";
    content = content ? content : "";
    hpconfig = getConfig();

    $.post(returnURL, 
        {useajax: ajaxcall, id: idval, type: typeval, value: content, attr: hpconfig },
        function (presult, pstatus) {
            formresult = presult;
            if ( pstatus==="success" && presult["status"]==="success" ) {
                console.log( ajaxcall + " POST returned: ");
                console.log(presult);
                if ( presult["hpconfig"] ) { setConfig(presult["hpconfig"]); }
                if ( presult["reload"] === "true") {
                    window.location.href = returnURL;
                }
            }
        }, "json"
    );
    
//    var controlForm = $('<form>', {'name': 'controlpanel', 'action': returnURL, 'target': '_top', 'method': 'POST'});
//    controlForm.appendTo("body");
//    // alert("Posting form for ajaxcall= " + ajaxcall + " to: " + retval);
//    // lets now add the hidden fields we need to post our form
//    controlForm.append(
//                  $('<input>', {'name': 'useajax', 'value': ajaxcall, 'type': 'hidden'})
//        ).append(
//                  $('<input>', {'name': 'id', 'value': idval, 'type': 'hidden'})
//        ).append(
//                  $('<input>', {'name': 'type', 'value': typeval, 'type': 'hidden'})
//        ).append(
//                  $('<input>', {'name': 'attr', 'value': tmpconfig, 'type': 'hidden'})
//        );
//    if ( content ) {
//        // controlForm.append( $('<input>', {'name': 'value', 'value': content, 'type':'hidden'} ));
//        controlForm.append(content);
//        // $("#dynocontent").hide();
//    }
//    if ( controlForm ) {
//        controlForm.submit();
//    }
}

function setupButtons() {

//    $("#optionsbutton").on("click", null, function(evt) {
    $("#controlpanel").on("click", "div.formbutton", function() {
        var buttonid = $(this).attr("id");
        if ( $(this).hasClass("confirm") ) {
            var pos = {top: 100, left: 100};
            createModal("Perform " + buttonid + " operation... Are you sure?", "body", true, pos, function(ui, content) {
                var clk = $(ui).attr("name");
                if ( clk==="okay" ) {
                    dynoForm(buttonid);
                    // if ( newForm) { newForm.submit(); }
                }
            });
        } else {
            dynoForm(buttonid);
            // if ( newForm) { newForm.submit(); }
        }
    });
    
    $("div.modeoptions").on("click","input.radioopts",function(evt){
        var opmode = $(this).attr("value");
        if ( opmode !== priorOpmode ) {
            if ( priorOpmode === "Reorder" ) {
                cancelSortable();
                cancelPagemove();
            } else if ( priorOpmode === "DragDrop" ) {
                var filters = [];
                $('input[name="useroptions[]"').each(function(){
                    if ( $(this).prop("checked") ) {
                        filters.push($(this).attr("value")); 
                    }
                });
//                alert(filters);
                hpconfig = getConfig();
                hpconfig["useroptions"] = filters;
                publishConfig();
//                $.post(returnURL, 
//                    {useajax: "savefilters", id: 0, type: "none", value: filters, attr: tmpconfig},
//                    function (presult, pstatus) {
//                        if (pstatus==="success" && presult["status"]==="success") {
//                            setConfig(presult["hpconfig"]);
//                            console.log( "Updated filters to: "+ strObject(filters) );
//                        }
//                    }, "json"
//                );
                cancelDraggable();
                delEditLink();
            }
            
            if ( opmode==="Reorder" ) {
                setupSortable();
                setupPagemove();
            } else if ( opmode==="DragDrop" ) {
                setupDraggable();
                addEditLink();
                
            // reload page fresh if we are returning from drag mode to operate mode
//            } else if ( opmode==="Operate" && (priorOpmode !== "Operate") ) {
//                // location.reload(true);
//                publishConfig();
//                window.location.href = returnURL;
            }
            
            priorOpmode = opmode;
        }
    });

    $("#controlpanel").on("click","div.restoretabs",function(evt){
        toggleTabs();
    });

//    $("div.panel").on("click",function(evt){
//        if ( priorOpmode === "Operate" && evt.target === this ) { toggleTabs(); }
//    });
}

function addEditLink() {
    
    // add links to edit and delete this tile
    $("div.panel > div.thing").each(function() {
       var editdiv = "<div class=\"editlink\" aid=" + $(this).attr("id") + ">Edit</div>";
       var deldiv = "<div class=\"dellink\" aid=" + $(this).attr("id") + ">Del</div>";
       $(this).append(editdiv).append(deldiv);
    });
    
    // show the skin 
    $("div.skinoption").show();
    
    $("div.editlink").on("click",function(evt) {
        var thing = "#" + $(evt.target).attr("aid");
        var str_type = $(thing).attr("type");
        var tile = $(thing).attr("tile");
        var strhtml = $(thing).html();
        
        // replace all the id tags to avoid dynamic updates
        strhtml = strhtml.replace(/ id="/g, " id=\"x_");
        editTile(str_type, tile, strhtml);
    });
    
    $("div.dellink").on("click",function(evt) {
        var thing = "#" + $(evt.target).attr("aid");
        var str_type = $(thing).attr("type");
        var tile = $(thing).attr("tile");
        var bid = $(thing).attr("bid");
        var panel = $(thing).attr("panel");
        var tilename = $("span.original.n_"+tile).html();
        var pos = {top: 100, left: 10};

        createModal("Remove: "+ tilename + " of type: "+str_type+" from room "+panel+"? Are you sure?", "body" , true, pos, function(ui, content) {
            var clk = $(ui).attr("name");
            if ( clk=="okay" ) {
                // remove it from the system
                // alert("Removing thing = " + tilename);
                hpconfig = getConfig();
                $.post(returnURL, 
                    {useajax: "dragdelete", id: bid, type: str_type, value: panel, tile: tile, attr: hpconfig},
                    function (presult, pstatus) {
                        if (pstatus==="success" && presult["status"]==="success") {
                            setConfig(presult["hpconfig"]);
                            console.log( "Removed tile: "+ $(thing).html() );
                            // remove it visually
                            $(thing).remove();
                        }
                    }, "json"
                );
            }
        });
        
    });
}

function delEditLink() {
//    $("div.editlink").off("click");
    $("div.editlink").each(function() {
       $(this).remove();
    });
    $("div.dellink").each(function() {
       $(this).remove();
    });
    // hide the skin and 
    $("div.skinoption").hide();
    
    closeModal();
}

function setupSaveButton() {
    
    $("#submitoptions").click(function(evt) {
        $("form.options").submit(); 
    });
    
    $("#resetoptions").click(function(evt) {
        $("form.options").reset(); 
    });
    
    $("#canceloptions").click(function(evt) {
        window.location.href = returnURL;
//        $.post(returnURL, 
//            {useajax: "canceloptions", id: 1, type: "none", value: "none", attr: hpconfig},
//            function (presult, pstatus) {
//                if (pstatus==="success" && presult["status"]==="success") {
//                    if ( presult["reload"]==="true") {
//                        window.location.href = returnURL;
//                    }
//                }
//            }, "json"
//        );
    });
}

function setupFilters() {
    
//    alert("Setting up filters");
   // set up option box clicks
    $('input[name="useroptions[]"]').click(function() {
        var theval = $(this).val();
        var ischecked = $(this).prop("checked");
        $("#allid").prop("checked", false);
        $("#noneid").prop("checked", false);
        $("#allid").attr("checked", false);
        $("#noneid").attr("checked", false);
        
        // set the class of all rows to invisible or visible
        var rowcnt = 0;
        var odd = "";
        if ( $("#optionstable") ) {
            $('table.roomoptions tr[type="'+theval+'"]').each(function() {
                if ( ischecked ) {
                    $(this).attr("class", "showrow");
                } else {
                    $(this).attr("class", "hiderow");
               }
            });
        
            $('table.roomoptions tr').each(function() {
                var theclass = $(this).attr("class");
                if ( theclass != "hiderow" ) {
                    rowcnt++;
                    rowcnt % 2 == 0 ? odd = " odd" : odd = "";
                    $(this).attr("class", "showrow"+odd);
               }
            });
        }
        
        // handle main screen catalog
        if ( $("#catalog") ) {
            $("#catalog div.thing[type=\""+theval+"\"]").each(function(){
                // alert( $(this).attr("class"));
                if ( ischecked && $(this).hasClass("hidden") ) {
                    $(this).removeClass("hidden");
                } else if ( ! ischecked && ! $(this).hasClass("hidden") ) {
                    $(this).addClass("hidden");
                }
            });
        }
    });
    
    $("#allid").click(function() {
//        alert("clicked all");
        $("#allid").prop("checked", true);
        $('input[name="useroptions[]"]').each(function() {
            if ( !$(this).prop("checked") ) {
                $(this).click()
            }
        });
        $("#noneid").attr("checked", false);
        $("#noneid").prop("checked", false);
    });
    
    $("#noneid").click(function() {
        $("#noneid").prop("checked", true);
        $('input[name="useroptions[]"]').each(function() {
            if ( $(this).prop("checked") ) {
                $(this).click()
            }
        });
        $("#allid").attr("checked", false);
        $("#allid").prop("checked", false);
    });
}

function setupPopup() {
        //Click out event!
    $("table.roomoptions").click(function(){
        processPopup();
    });
    
    // add code to disable when click anywhere but the cell
    $("div.maintable").click(function(e) {
        if ( e.target.id !== "trueincell" && popupStatus==1) {
            disablePopup();
        }
            // alert ( e.target.id );
    });
    
    
    // Press Escape or Return event!
    // fix long-standing bug
    $(document).keypress(function(e){
        if ( e.keyCode===13  && popupStatus===1){
            processPopup();
        } else if ( e.keyCode===27 && popupStatus===1 ){
            disablePopup();
        }
    });

    // disable input in our dynamic form item
    $("#trueincell").keypress(function(e) {
        if ( e.keyCode===27 && popupStatus==1 ){
            disablePopup();
        }
    });
    
    $("#trueincell").focus().blur(function() {
        processPopup();
    });
    
    $("table.headoptions").on("click", "th.roomname", function() {
        // alert("in cell editing");
        if ($(this).html().startsWith("<input id")) { return true; }

        // if another popup is active, process it
        if (popupStatus === 1) {
            processPopup();
        }

        var roomval = $(this).children().first().attr("value");
        var roomname = $(this).text().trim();

        //do a real in-cell edit - save global parameters
        // cellclicked = that;
        popupStatus = 1;
        popupSave = $(this).html();
        popupCell = this;
        popupVal = parseInt(roomval);
        popupRoom = roomname;

        // change the content to an input box
        var thesize = roomname.length + 2;

        // save anything after the pure text
        // var savedhidden = $(that).html().substring(thesize);

//         if (thesize < maxlen+1) thesize = maxlen+1;
        var oldhidden = ""; // '<input type="hidden" name="o_' + roomname + '" value="' + popupVal + '" />';
        $(this).html('<input id="trueincell" type="text" size="'+ thesize + '" value="' + roomname+'" />' + oldhidden);
        return false;
        
    });
       
}

function toggleTabs() {
    var hidestatus = $("#restoretabs");
    if ( $("#roomtabs").hasClass("hidden") ) {
        $("#roomtabs").removeClass("hidden");
        if ( hidestatus ) hidestatus.html("Hide Tabs");
    } else {
        $("#roomtabs").addClass("hidden");
        if ( hidestatus ) hidestatus.html("Show Tabs");
    }
}

function processPopup( ) {
    // processEdit( ineditvalue );
    // $(cellclicked).empty().html( ineditvalue );
    // alert("ineditvalue = " + ineditvalue);
//    alert("processing... popupStatus = " + popupStatus);

    if (popupStatus==1) {
        // put the new text on the screen
        var thenewval = $("#trueincell").val();
//        alert("Changing room name from: " + popupRoom + " to: "+thenewval);
        
        // clean the user provided room name to ensure it doesnt have crap in it
        //TODO
        
        var newhidden = '<input type="hidden" name="o_' + thenewval + '" value="' + popupVal + '" />';
        $(popupCell).html( thenewval + newhidden );
//        
        // replace the room name in the entire options table column
        $('table.roomoptions td > input[name="'+popupRoom+'\[\]"]').each(function() {
            // var tileval = parseInt($(this).attr("value"));
            $(this).attr("name",thenewval + '[]');
        });
        //       
    }

    popupStatus = 0;
}

function disablePopup(){
//    alert("disabling... popupStatus = " + popupStatus + " popupSave = " + popupSave);
    
    //disables popup only if it is enabled
    if( popupStatus==1 && popupSave){
        $(popupCell).html(popupSave);
    }
    popupStatus = 0;
}

function strObject(o, level) {
  var out = '';
  if ( !level ) { level = 0; }

  if ( typeof o !== "object") { return o + '\n'; }
  
  for (var p in o) {
    out += p + ': ';
    if (typeof o[p] === "object") {
        if ( level > 10 ) {
            out+= ' [more beyond 10 levels...] \n';
        } else {
            out += strObject(o[p], level+1);
        }
    } else {
        out += o[p] + '\n';
    }
  }
  return out;
}

function fixTrack(tval) {
    if ( tval.trim() === "" ) {
        tval = "None"; 
    } 
    else if ( tval.length > 124) { 
        tval = tval.substring(0,120) + " ..."; 
    }
    return tval;
}


// update all the subitems of any given specific tile
// note that some sub-items can update the values of other subitems
// this is exactly what happens in music tiles when you hit next and prev song
function updateTile(aid, presult) {

    // do something for each tile item returned by ajax call
    $.each( presult, function( key, value ) {
        var targetid = '#a-'+aid+'-'+key;

        // only take action if this key is found in this tile
        if ($(targetid) && value) {
            var oldvalue = $(targetid).html();
            var oldclass = $(targetid).attr("class");
            // alert(" aid="+aid+" key="+key+" targetid="+targetid+" value="+value+" oldvalue="+oldvalue+" oldclass= "+oldclass);

            // remove the old class type and replace it if they are both
            // single word text fields like open/closed/on/off
            // this avoids putting names of songs into classes
            // also only do this if the old class was there in the first place
            // also handle special case of battery and music elements
            if ( key=="battery") {
                var powmod = parseInt(value);
                powmod = powmod - (powmod % 10);
                value = "<div style=\"width: " + powmod.toString() + "%\" class=\"ovbLevel L" + powmod.toString() + "\"></div>";
            } else if ( key=="track") {
                value = fixTrack(value);
            }
            // handle weather icons
            else if ( key==="weatherIcon" || key==="forecastIcon") {
                if ( value.substring(0,3) === "nt_") {
                    value = value.substring(3);
                }
                if ( oldvalue != value ) {
                    $(targetid).removeClass(oldvalue);
                    $(targetid).addClass(value);
                }
//                value = "<img src=\"media/" + iconstr + ".png\" alt=\"" + iconstr + "\" width=\"60\" height=\"60\">";
//                value += "<br />" + iconstr;
            } else if ( (key == "level" || key == "colorTemperature") && $(targetid).slider ) {
//                var initval = $(this).attr("value");
                $(targetid).slider("value", value);
                value = false;
            } else if ( key=="color") {
//                alert("updating color: "+value);
                $(targetid).html(value);
//                setupColors();
            } else if ( oldclass && oldvalue && value &&
                     $.isNumeric(value)===false && 
                     $.isNumeric(oldvalue)===false &&
                     oldclass.indexOf(oldvalue)>=0 ) {
                    $(targetid).removeClass(oldvalue);
                    $(targetid).addClass(value);
                
            }

                // update the content 
                if (oldvalue && value) {
                    $(targetid).html(value);
                }
            }
    });
}

// this differs from updateTile by calling ST to get the latest data first
// it then calls the updateTile function to update each subitem in the tile
function refreshTile(aid, bid, thetype) {
    var ajaxcall = "doquery";
    if ( bid.startsWith("h_") ) {
        ajaxcall = "queryhubitat";
        bid = bid.substring(2);
    }
    $.post(returnURL, 
        {useajax: ajaxcall, id: bid, type: thetype, value: "none", attr: "none"},
        function (presult, pstatus) {
            if (pstatus==="success" && presult!==undefined ) {
                updateTile(aid, presult);
            }
        }, "json"
    );
}

// refresh tiles on this page when switching to it
function setupTabclick() {
    // $("li.ui-tab > a").click(function() {
    $("a.ui-tabs-anchor").click(function() {
        // save this tab for default next time
        var defaultTab = $(this).attr("id");
        if ( defaultTab ) {
            setCookie( 'defaultTab', defaultTab, 30 );
        }
    });
}

function allTimerSetup(timerval) {

    // define the timer callback function to update all tiles every 60 seconds
    // var timerval = 15000;
    if ( !timerval || timerval < 5000 ) { return; }
    var updarray = ["all",timerval];
    updarray.myMethod = function() {
        // skip if not in operation mode or if inside a modal dialog box
        if ( priorOpmode !== "Operate" || modalStatus ) { 
            console.log ("Timer skipped: opmode= "+priorOpmode+" modalStatus= "+modalStatus);
            return; 
        }
        var that = this;
        var err;
        
        // console.log ( "Posting SmartThings update..." );
        try {
            $.post(returnURL, 
                {useajax: "doquery", id: that[0], type: that[0], value: "none", attr: "none"},
                function (presult, pstatus) {
                    if (pstatus==="success" && presult!==undefined ) {
                        // console.log("Success polling [" + returnURL + "]. SmartThings returned "+ Object.keys(presult).length+ " items");

                        // go through all tiles and update
                        try {
                        $('div.panel div.thing').each(function() {
                            var aid = $(this).attr("id");
                            // skip the edit in place tile
                            if ( aid.startsWith("t-") ) {
                                aid = aid.substring(2);
                                var tileid = $(this).attr("tile");
                                var bid = $(this).attr("bid");
                                if ( !bid.startsWith("h_") ) { // && tileid in presult ) {
                                    var thevalue;
                                    try {
                                        thevalue = presult[tileid];
                                    } catch (err) {
                                        tileid = parseInt(tileid, 10);
                                        try {
                                            thevalue = presult[tileid];
                                        } catch (err) {}
                                    }
                                    // handle both direct values and bundled values
                                    if ( thevalue && thevalue.hasOwnProperty("value") ) {
                                        thevalue = thevalue.value;
                                    }
                                    // if ( tileid=="201" ) { alert("updating tile " + tileid + " ... value = "+ strObject(thevalue)); }
                                    if ( thevalue ) { updateTile(aid,thevalue); }
                                }
                            }
                        });
                        } catch (err) { console.error("Polling error", err.message); }
                    }
                }, "json"
            );
        } catch(err) {
            console.error ("Polling error", err.message);
        }
        
        // repeat the method above indefinitely
        setTimeout(function() {updarray.myMethod();}, this[1]);
    };

    // wait before doing first one
    setTimeout(function() {updarray.myMethod();}, timerval);
}

function allHubitatSetup(timerval) {

    // define the timer callback function to update all Hubitat tiles every 5 seconds
    // var timerval = 5000;
    if ( !timerval || timerval < 5000 ) { return; }
    var hubarray = ["all",timerval];
    hubarray.myMethod = function() {
        // skip if not in operation mode or if inside a modal dialog box
        if ( priorOpmode !== "Operate" || modalStatus ) { return; }
        var that = this;
        try {
            $.post(returnURL, 
                {useajax: "queryhubitat", id: that[0], type: that[0], value: "none", attr: "none"},
                function (presult, pstatus) {
                    if (pstatus==="success" && presult!==undefined && presult ) {
//                        console.log("Success polling [" + returnURL + "]. Hubitat returned "+ Object.keys(presult).length+ " items");

                        // go through all tiles and update
                        $('div.panel div.thing').each(function() {
                            var aid = $(this).attr("id");
                            // skip the edit in place tiles
                            if ( aid.startsWith("t-") ) {
                                aid = aid.substring(2);
                                var tileid = $(this).attr("tile");
                                var bid = $(this).attr("bid");
                                if ( bid.startsWith("h_") ) {
                                    var thevalue;
                                    try {
                                        thevalue = presult[tileid];
                                    } catch (err) {
                                        tileid = parseInt(tileid, 10);
                                        try {
                                            thevalue = presult[tileid];
                                        } catch (err) {}
                                    }
                                    // handle both direct values and bundled values
                                    if ( thevalue && thevalue.hasOwnProperty("value") ) {
                                        thevalue = thevalue.value;
                                    }
                                    if ( thevalue ) { updateTile(aid,thevalue); }
                                }
                            }

                        });
                    }
                }, "json"
            );
        } catch (e) { }

        // repeat the method above indefinitely
        setTimeout(function() {hubarray.myMethod();}, this[1]);
    };

    // wait before doing first one
    setTimeout(function() {hubarray.myMethod();}, timerval);
}

function updateMode() {
    $('div.thing.mode-thing').each(function() {
        var otheraid = $(this).attr("id").substring(2);
        var rbid = $(this).attr("bid");
        setTimeout(function() {
            refreshTile(otheraid, rbid, "mode");
        }, 2000);
    });
}

// find all the things with "bid" and update the value clicked on somewhere
// this routine is called every time we click on something to update its value
// but we also update similar things that are impacted by this click
// that way we don't need to wait for the timers to kick in to update
// the visual items that people will expect to see right away
function updAll(trigger, aid, bid, thetype, pvalue) {

    // update trigger tile first
    // alert("aid= "+aid+" bid= "+bid+" type= "+thetype+" pvalue= "+strObject(pvalue));
    if ( trigger !== "slider") {
        updateTile(aid, pvalue);
    }
    
    // for music tiles, wait few seconds and refresh again to get new info
    if (thetype==="music") {
        setTimeout(function() {
            refreshTile(aid, bid, thetype);
        }, 3000);
    }
    
    // for doors wait before refresh to give garage time to open or close
    if (thetype==="door") {
        setTimeout(function() {
            refreshTile(aid, bid, thetype);
        }, 15000);
    }
        
    // go through all the tiles this bid and type (easy ones)
    // this will include the trigger tile so we skip it
    $('div.thing[bid="'+bid+'"][type="'+thetype+'"]').each(function() {
        var otheraid = $(this).attr("id").substring(2);
        if (otheraid !== aid) { updateTile(otheraid, pvalue); }
    });
    
    // if this is a switch on/off trigger go through and set all light types
    // change to use refreshTile function so it triggers PHP session update
    // but we have to do this after waiting a few seconds for ST to catch up
    // actually we do both for instant on screen viewing
    // the second call is needed to make screen refreshes work properly
//    if (thetype==="switch" || thetype==="bulb" || thetype==="light") {
    if (trigger==="switch") {
        // updateMode();
        $('div.thing[bid="'+bid+'"][type="switch"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="switchlevel"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="bulb"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="light"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
    }
    
    // if this is a routine action then update the modes immediately
    // also do this update for piston or momentary refreshes
    // use the same delay technique used for music tiles noted above
    if (thetype==="routine") {
        updateMode();
    }
    
    // if this is a switchlevel go through and set all switches
    // change to use refreshTile function so it triggers PHP session update
    // but we have to do this after waiting a few seconds for ST to catch up
    // NOTE: removed the above logic because our updates are now faster and frequent
    if (trigger==="level-up" || trigger==="level-dn" || trigger==="slider" ||
        trigger==="hue-up" || trigger==="hue-dn" ||
        trigger==="saturation-up" || trigger==="saturation-dn" ||
        trigger==="colorTemperature-up" || trigger==="colorTemperature-dn" ) {
//        alert("level trigger: bid= "+bid+" pvalue= "+strObject(pvalue));
        $('div.thing[bid="'+bid+'"][type="switch"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="switchlevel"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="bulb"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
        $('div.thing[bid="'+bid+'"][type="light"]').each(function() {
            var otheraid = $(this).attr("id").substring(2);
            if (otheraid !== aid) { updateTile(otheraid, pvalue); }
        });
    }
    
}

// setup trigger for clicking on the action portion of this thing
// this used to be done by page but now it is done by sensor type
function setupPage(trigger) {
   
    // alert("setting up " + trigger);
    // var actionid = "div." + trigger;

    // $(actionid).click(function() {
    $("div.overlay > div").off("click.tileactions");
    $("div.overlay > div").on("click.tileactions", function() {
        
        var aid = $(this).attr("aid");
        var theclass = $(this).attr("class");
        var subid = $(this).attr("subid");
        
        // avoid doing click if the target was the title bar
        // or if not in Operate mode; also skip sliders tied to subid === level
        if ( aid===undefined || priorOpmode!=="Operate" || modalStatus ||
             subid==="level" ||
             ( $(this).attr("id") && $(this).attr("id").startsWith("s-") ) ) return;
        
        var tile = '#t-'+aid;
        var bid = $(tile).attr("bid");
        var bidupd = bid;
        var thetype = $(tile).attr("type");
        var targetid = '#a-'+aid+'-'+subid;
        
        // set the action differently for Hubitat
        var ajaxcall = "doaction";
        if ( bid.startsWith("h_") ) {
            ajaxcall = "dohubitat";
            // bid = bid.substring(2);
        }

        var thevalue;
        // for switches and locks set the command to toggle
        // for most things the behavior will be driven by the class value = swattr
        if (subid==="switch" || subid==="lock" || thetype==="door" ) {
            thevalue = "toggle";
        // handle shm special case
        } else if ( thetype=="shm") {
            thevalue = $(targetid).html();
            if ( thevalue=="off" ) { thevalue = "stay"; }
            else if ( thevalue=="stay") { thevalue = "away"; }
            else { thevalue = "off"; }
        } else {
            thevalue = $(targetid).html();
        }

//        alert('aid= ' + aid +' bid= ' + bid + ' targetid= '+targetid+ ' subid= ' + subid + ' type= ' + thetype + ' class= ['+theclass+'] value= '+thevalue);
//        return;

        // turn momentary items on or off temporarily
        if (thetype==="momentary" || thetype==="piston") {
            var tarclass = $(targetid).attr("class");
            var that = targetid;
            // define a class with method to reset momentary button
            var classarray = [$(that), tarclass, thevalue];
            classarray.myMethod = function() {
                this[0].attr("class", this[1]);
                this[0].html(this[2]);
            };
            $.post(returnURL, 
                {useajax: ajaxcall, id: bid, type: thetype, value: thevalue, attr: subid},
                function(presult, pstatus) {
                    if (pstatus==="success" && presult!==undefined && presult!==false) {
                        console.log( ajaxcall + " POST returned: "+ strObject(presult) );
                        if (thetype==="piston") {
                            $(that).addClass("firing");
                            $(that).html("firing");
                        } else if ( $(that).hasClass("on") ) {
                            $(that).removeClass("on");
                            $(that).addClass("off");
                            $(that).html("off");
                        } else {
                            $(that).removeClass("off");
                            $(that).addClass("on");
                            $(that).html("on");
                        }
                        setTimeout(function(){classarray.myMethod();}, 1500);
                        updateMode();
                    }
                });
//        } else if (thetype==="switch" || thetype==="lock" || thetype==="switchlevel" ||
//                   thetype==="thermostat" || thetype==="music" || thetype==="bulb" ) {
        // now we invoke action for everything
        // within the groovy code if action isn't relevant then nothing happens
        } else if ( thetype==="video" ) {
            if ( subid === "url" ) {
                console.log("Replaying latest embedded video: " + thevalue);
                $(targetid).html(thevalue);
            } else {
                console.log("Video actions require you to click on the video");
            }
        } else if ( thetype==="weather") {
            console.log("Weather tiles have no actions...");
        } else {
//            alert("id= "+bid+" type= "+thetype+" value= "+thevalue+" class="+theclass);
            console.log(ajaxcall + " : id= "+bid+" type= "+thetype+ " subid= " + subid + " value= "+thevalue+" class="+theclass);
            $.post(returnURL, 
                   {useajax: ajaxcall, id: bid, type: thetype, value: thevalue, attr: theclass, subid: subid},
                   function (presult, pstatus) {
                        if (pstatus==="success" ) {
                            try {
                                var keys = Object.keys(presult);
                                if ( keys && keys.length) {
                                    console.log( ajaxcall + " POST returned: "+ strObject(presult) );
                                    updAll(subid,aid,bidupd,thetype,presult);
                                } else {
                                    console.log( ajaxcall + " POST returned nothing to update ");
                                }
                            } catch (e) { }
                        }
                   }, "json"
            );
            
        } 
                            
    });
   
};

function stickyNav(){var s=document.getElementById("sticky-nav"),l=document.getElementsByClassName("sticky-btn");if(document.body.scrollTop>45||document.documentElement.scrollTop>45){s.classList.add("nav-js-scroll");for(var t=0;t<l.length;t++)l[t].classList.add("btn-js-scroll")}else{s.classList.remove("nav-js-scroll");for(t=0;t<l.length;t++)l[t].classList.remove("btn-js-scroll")}}
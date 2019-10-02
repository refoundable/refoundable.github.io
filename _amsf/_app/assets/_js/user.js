// essays -> on scroll, stick inner nav to top
 function stickyNav(){
   var sn = document.getElementById("sticky-nav");
   var sb = document.getElementsByClassName('sticky-btn');
      if(document.body.scrollTop > 45 || document.documentElement.scrollTop > 45){
         sn.classList.add("nav-js-scroll");
         for(var i = 0; i < sb.length; i++) {
           sb[i].classList.add("btn-js-scroll");
       }
      }
      else{
         sn.classList.remove("nav-js-scroll");
         for(var i = 0; i < sb.length; i++) {
           sb[i].classList.remove("btn-js-scroll");
       }
      }
}
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>

var slider1 = new Swiper('.slider1', {
	effect: 'slide',
	loop: true,
	speed: 666,
	direction: 'horizontal',
	spaceBetween: 30, // Adjust for desktop
	mousewheel: {
		forceToAxis: true
	},
	pagination: {
		el: '.swiper-pagination',
	},
	// Breakpoints
	breakpoints: {
		// when window width is <= 640px (mobile)
		640: {
			slidesPerView: 1,
			spaceBetween: 0
		},
		// when window width is <= 1024px (tablet)
		1024: {
			slidesPerView: 2,
			spaceBetween: 0
		}
	}
	
});

var slider2 = new Swiper('.slider2', {
	effect: 'slide',
	loop: true,
	speed: 666,
	direction: 'horizontal',
	slidesPerView: 2, // Adjust for desktop
	spaceBetween: 30, // Adjust for desktop
	mousewheel: {
		forceToAxis: true
	},
	pagination: {
		el: '.swiper-pagination',
	},
	breakpoints: {
		// when window width is <= 640px (mobile)
		640: {
			slidesPerView: 1,
			spaceBetween: 0
		},
		// when window width is <= 1024px (tablet)
		1024: {
			slidesPerView: 1,
			spaceBetween: 0
		}
	}
	


});

</script>


————




<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>

var slider1 = new Swiper ('.slider1', {
	effect: 'slide',
	loop: true,
	speed: 666,
	direction: 'horizontal',
	slidesPerView: 2,  // Default to 2 slides per view
	spaceBetween: 0,  // Default space between slides
	mousewheel: {
	  forceToAxis: true
	},

	pagination: {
	  el: '.swiper-pagination',
	},

});

var slider2 = new Swiper ('.slider2', {
	loop: true,
	speed: 666,
	direction: 'horizontal',
	slidesPerView: 1, 
	spaceBetween: 0,  
	mousewheel: {
	  forceToAxis: true
	},
	
	effect: 'fade',
	pagination: {
	  el: '.swiper-pagination',
	},
	
});

</script>






————

<script>
var slider1 = new Swiper ('.slider1', {
	effect: 'slide',
	
	pagination: {
	  el: '.swiper-pagination',
	},
	
	navigation: {
	  nextEl: '.swiper-button-next',
	  prevEl: '.swiper-button-prev',
	},

	scrollbar: {
	  el: '.swiper-scrollbar',
	},
});


var slider2 = new Swiper ('.slider2', {
	effect: 'fade',
	
	pagination: {
	  el: '.swiper-pagination',
	},
	
	navigation: {
	  nextEl: '.swiper-button-next',
	  prevEl: '.swiper-button-prev',
	},

	scrollbar: {
	  el: '.swiper-scrollbar',
	},
});


var slider3 = new Swiper ('.slider3', {
	effect: 'cube',
	
	pagination: {
	  el: '.swiper-pagination',
	},
	
	navigation: {
	  nextEl: '.swiper-button-next',
	  prevEl: '.swiper-button-prev',
	},

	scrollbar: {
	  el: '.swiper-scrollbar',
	},
});

</script>


<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>

var slider1 = new Swiper ('.slider1', {
	effect: 'slide',
	pagination: {
	  el: '.swiper-pagination',
	},
	navigation: {
	  nextEl: '.swiper-button-next',
	  prevEl: '.swiper-button-prev',
	},
	scrollbar: {
	  el: '.swiper-scrollbar',
	},
});

var slider2 = new Swiper ('.slider2', {
	effect: 'fade',
	pagination: {
	  el: '.swiper-pagination',
	},
	navigation: {
	  nextEl: '.swiper-button-next',
	  prevEl: '.swiper-button-prev',
	},
	scrollbar: {
	  el: '.swiper-scrollbar',
	},
});


</script>



 <div class="swiper-container swiper1">
		<div class="swiper-wrapper">
			<div class="swiper-slide">Slide 1</div>
			<div class="swiper-slide">Slide 2</div>
			<div class="swiper-slide">Slide 3</div>
			<div class="swiper-slide">Slide 4</div>
			<div class="swiper-slide">Slide 5</div>
			<div class="swiper-slide">Slide 6</div>
			<div class="swiper-slide">Slide 7</div>
			<div class="swiper-slide">Slide 8</div>
			<div class="swiper-slide">Slide 9</div>
			<div class="swiper-slide">Slide 10</div>
		</div>
		<!-- Add Pagination -->
		<div class="swiper-pagination swiper-pagination1"></div>
	</div>

	<!-- Swiper -->
	<div class="swiper-container swiper2">
		<div class="swiper-wrapper">
			<div class="swiper-slide">Slide 1</div>
			<div class="swiper-slide">Slide 2</div>
			<div class="swiper-slide">Slide 3</div>
			<div class="swiper-slide">Slide 4</div>
			<div class="swiper-slide">Slide 5</div>
			<div class="swiper-slide">Slide 6</div>
			<div class="swiper-slide">Slide 7</div>
			<div class="swiper-slide">Slide 8</div>
			<div class="swiper-slide">Slide 9</div>
			<div class="swiper-slide">Slide 10</div>
		</div>
		<!-- Add Pagination -->
		<div class="swiper-pagination swiper-pagination2"></div>

 <!-- Swiper JS -->
	<script src="../dist/js/swiper.min.js"></script>

<!-- Initialize Swiper -->
<script>
var swiper1 = new Swiper('.swiper1', {
	pagination: '.swiper-pagination1',
	paginationClickable: true,
});
var swiper2 = new Swiper('.swiper2', {
	pagination: '.swiper-pagination2',
	paginationClickable: true,
});
<script>








import Swiper from 'swiper/swiper-bundle.mjs';
import 'swiper/swiper-bundle.css';

var swiper1 = new Swiper('.swiper1', {
  slidesPerView: 3,
  direction: 'horizontal',
  spaceBetween: 30,
  pagination: {
	el: '.swiper-pagination1',
	clickable: true,
  },
});

var swiper2 = new Swiper('.swiper2', {
  slidesPerView: 4,
  direction: 'horizontal',
  spaceBetween: 30,
  pagination: {
	el: '.swiper-pagination2',
	clickable: true,
  },
});


<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"/>

<style>
.swiper1 {
  width: 100%;
  height: 100%;
  --swiper-pagination-color: #000000;
  --swiper-pagination-left: auto;
  --swiper-pagination-right: 8px;
  --swiper-pagination-bottom: 8px;
  --swiper-pagination-top: auto;
  --swiper-pagination-fraction-color: inherit;
  --swiper-pagination-progressbar-bg-color: rgba(0, 0, 0, 0.25);
  --swiper-pagination-progressbar-size: 4px;
  --swiper-pagination-bullet-size: 8px;
  --swiper-pagination-bullet-width: 8px;
  --swiper-pagination-bullet-height: 8px;
  --swiper-pagination-bullet-inactive-color: #000;
  --swiper-pagination-bullet-inactive-opacity: 0.2;
  --swiper-pagination-bullet-opacity: 1;
  --swiper-pagination-bullet-horizontal-gap: 4px;
  --swiper-pagination-bullet-vertical-gap: 6px;
}

<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script>
var swiper1 = new Swiper('.swiper1', {
  slidesPerView: 3,
  direction: 'horizontal',
  spaceBetween: 30,
  pagination: {
	el: '.swiper-pagination1',
	clickable: true,
  },
});

var swiper2 = new Swiper('.swiper2', {
  slidesPerView: 4,
  direction: 'horizontal',
  spaceBetween: 30,
  pagination: {
	el: '.swiper-pagination2',
	clickable: true,
  },
});
</script>




<script>
  var swiper1 = new Swiper('.swiper1', {
	  
  	loop: true,
	speed: 666,
	direction: 'horizontal',
	slidesPerView: 2,  // Default to 2 slides per view
	spaceBetween: 0,  // Default space between slides
	mousewheel: {
	  forceToAxis: true
	},
	
	pagination: {
	  el: '.swiper-pagination',
	  type: 'bullets',
	},
	// Responsive breakpoints
	breakpoints: {
	  // when window width is >= 320px
	  320: {
		slidesPerView: 1,
		spaceBetween: 0
	  },
	  // when window width is >= 480px
	  480: {
		slidesPerView: 2,  // Keeping 2 slides in view
		spaceBetween: 0
	  },
	  // when window width is >= 640px
	  640: {
		slidesPerView: 2,  // Keeping 2 slides in view
		spaceBetween: 0
	  }
	}
	  
  });
  
  var swiper2 = new Swiper('.swiper-project1', {
  loop: true,
	speed: 666,
	direction: 'horizontal',
	slidesPerView: 2,  // Default to 2 slides per view
	spaceBetween: 0,  // Default space between slides
	mousewheel: {
	  forceToAxis: true
	},
	
	pagination: {
	  el: '.swiper-pagination-project1',
	  type: 'bullets',
	},
	// Responsive breakpoints
	breakpoints: {
	  // when window width is >= 320px
	  320: {
		slidesPerView: 1,
		spaceBetween: 0
	  },
	  // when window width is >= 480px
	  480: {
		slidesPerView: 2,  // Keeping 2 slides in view
		spaceBetween: 0
	  },
	  // when window width is >= 640px
	  640: {
		slidesPerView: 2,  // Keeping 2 slides in view
		spaceBetween: 0
	  }
	}
  });

</script>



=

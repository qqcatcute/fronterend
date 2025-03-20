document.addEventListener("DOMContentLoaded", function () {
  const topbarCar = document.querySelector(".topbar-car");
  const carmini = document.querySelector(".carmini");
  topbarCar.addEventListener("mouseenter", () => {

    topbarCar.classList.add("active");
  });
  topbarCar.addEventListener("mouseleave", () => {
    topbarCar.classList.remove("active");
  });
})

document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.querySelector('.search-form');
  const searchText = document.querySelector('.search-text');
  const searchNav = document.querySelector('.search-nav');

  // 点击输入框时
  searchText.addEventListener('focus', function () {
    searchForm.classList.add('active');
  });

  // 点击页面其他区域时
  document.addEventListener('click', function (e) {
    if (!searchForm.contains(e.target)) {
      searchForm.classList.remove('active');
    }
  });

  // 输入框失去焦点时
  searchText.addEventListener('blur', function () {
    setTimeout(() => {
      searchForm.classList.remove('active');
    }, 200);
  });
});

// 小米框js部分


document.addEventListener("DOMContentLoaded", function () {
  const xiaomiNav = document.querySelector('.nav-item.xiaomi');
  const listNav = document.querySelector('.list-nav');
  var timeout;

  // 显示下拉框的函数
  function showDropdown() {
    clearTimeout(timeout);
    listNav.classList.add('active');
  }

  // 隐藏下拉框的函数，延时 300ms
  function hideDropdown() {
    timeout = setTimeout(function () {
      listNav.classList.remove('active');
    }, 300);
  }


  xiaomiNav.addEventListener('mouseenter', showDropdown);
  listNav.addEventListener('mouseenter', showDropdown);


  xiaomiNav.addEventListener('mouseleave', hideDropdown);
  listNav.addEventListener('mouseleave', hideDropdown);
});

// redmi下拉框部分

document.addEventListener("DOMContentLoaded", function () {
  const redmiNav = document.querySelector('.nav-item.redmi');
  const listNav1 = document.querySelector('.list-nav1');
  var timeout1;

  // 显示下拉框的函数
  function showDropdown() {
    clearTimeout(timeout1);
    listNav1.classList.add('active');
  }

  // 隐藏下拉框的函数，延时 300ms
  function hideDropdown() {
    timeout1 = setTimeout(function () {
      listNav1.classList.remove('active');
    }, 300);
  }

  // 当鼠标进入菜单项或下拉框时显示下拉框
  redmiNav.addEventListener('mouseenter', showDropdown);
  listNav1.addEventListener('mouseenter', showDropdown);

  // 当鼠标离开菜单项和下拉框时隐藏下拉框
  redmiNav.addEventListener('mouseleave', hideDropdown);
  listNav1.addEventListener('mouseleave', hideDropdown);
});






document.addEventListener("DOMContentLoaded", function () {
  // 初始数据
  const sliderData = [

    { src: 'images/lunbo1.jpg' },
    { src: 'images/lunbo2.webp' },
    { src: 'images/lunbo3.webp' },
    { src: 'images/lunbo4.webp' },
    { src: 'images/lunbo5.webp' },
    { src: 'images/lunbo6.webp' }

  ]
  // 两种做法 一种是替换文本 一种是替换路径 
  // 获取轮播图的容器元素
  // const swiperWrapper = document.querySelector('.swiper-wrapper');
  const img = document.querySelector('.swiper-wrapper img')

  img.src = sliderData[0].src
  // 初始化显示第一张图片
  // swiperWrapper.innerHTML = `<a href="#"><img src="${sliderData[0].src}" alt=""></a>`;
  // 1左右按钮
  // 1.1获取按钮
  const next = document.querySelector('.swiper-button-next')
  let i = 0
  // 1.2注册点击事件
  next.addEventListener('click', function (
  ) {
    // console.log(11)
    i++
    if (i >= sliderData.length) {
      i = 0;
    }
    // 更新轮播图内容，显示下一张图片
    // swiperWrapper.innerHTML = `<a href="#"><img src="${sliderData[i].src}" alt=""></a>`;
    img.src = sliderData[i].src

    // 更换小圆点 反引号是模板字符串 
    document.querySelector('.swiper-pagination .dotactive').classList.remove('dotactive')
    document.querySelector(`.swiper-pagination a:nth-child(${i + 1})`).classList.add('dotactive')
  })


  const prev = document.querySelector('.swiper-button-prev')

  prev.addEventListener('click', function (
  ) {
    // console.log(11)
    i--
    if (i < 0) {
      i = sliderData.length - 1;
    }
    // 更新轮播图内容，显示下一张图片
    // swiperWrapper.innerHTML = `<a href="#"><img src="${sliderData[i].src}" alt=""></a>`;
    toggle()
  })
  // 做个函数 调用
  function toggle() {
    img.src = sliderData[i].src


    document.querySelector('.swiper-pagination .dotactive').classList.remove('dotactive')
    document.querySelector(`.swiper-pagination a:nth-child(${i + 1})`).classList.add('dotactive')
  }



  // 自动播放
  let timeId = setInterval(function () {
    next.click()
  }, 3000)

  const slider = document.querySelector('.swiper-wrapper')
  slider.addEventListener('mouseenter', function () {
    clearInterval(timeId)
  }
  )

  slider.addEventListener('mouseleave', function () {
    timeId = setInterval(function () {
      next.click()
    }, 2000)
  }
  )

})





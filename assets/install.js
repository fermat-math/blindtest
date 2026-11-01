/* 홈 화면에 앱으로 설치하기 안내 */
(function(){
  if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
  var standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(standalone)return;
  var ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/.test(ua);
  if(!ios&&!android)return;
  var KEY='fermat.install.hide2';try{if(sessionStorage.getItem(KEY))return}catch(e){}
  var kakao=/KAKAOTALK/i.test(ua),inapp=kakao||/NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua);
  var teacher=/teacher\.html/.test(location.pathname),appName=teacher?'페르마 선생님':'페르마 시험대비';
  var css='.fi-bar{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9999;background:#13283b;color:#fff;border-radius:14px;padding:12px 12px 12px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.25);font:14px/1.45 system-ui,sans-serif}'+
    '.fi-bar img{width:42px;height:42px;border-radius:10px;flex:none}.fi-bar .fi-t{flex:1;min-width:0}.fi-bar b{display:block;font-size:15px}.fi-bar small{opacity:.85}'+
    '.fi-bar button{font:inherit;font-weight:700;border:0;border-radius:9px;padding:8px 12px;cursor:pointer}.fi-go{background:#f4c84a;color:#13283b}.fi-x{background:transparent;color:#fff;opacity:.7;padding:8px 6px!important}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  function bar(html,btnText,onGo){var d=document.createElement('div');d.className='fi-bar';d.setAttribute('role','dialog');d.setAttribute('aria-label','앱 설치 안내');
    d.innerHTML='<img src="assets/icons/'+(teacher?'t':'s')+'-192.png" alt=""><div class="fi-t">'+html+'</div>'+(btnText?'<button class="fi-go" type="button">'+btnText+'</button>':'')+'<button class="fi-x" type="button" aria-label="닫기">✕</button>';
    d.querySelector('.fi-x').onclick=function(){try{sessionStorage.setItem(KEY,'1')}catch(e){}d.remove()};
    if(btnText)d.querySelector('.fi-go').onclick=function(){onGo(d)};
    (document.body?Promise.resolve():new Promise(function(r){addEventListener('DOMContentLoaded',r)})).then(function(){document.body.appendChild(d)});return d}
  if(inapp){
    if(kakao&&android){bar('<b>'+appName+' 앱으로 쓰기</b><small>카카오톡 안에서는 설치가 안 돼요. 크롬으로 열어서 설치해요.</small>','크롬으로 열기',function(){location.href='kakaotalk://web/openExternal?url='+encodeURIComponent(location.href)})}
    else bar('<b>'+appName+' 앱으로 쓰기</b><small>'+(ios?'오른쪽 아래 공유(또는 ⋯) → <b style="display:inline">Safari로 열기</b>를 누른 뒤 설치해요.':'오른쪽 위 ⋮ → <b style="display:inline">다른 브라우저로 열기</b>를 누른 뒤 설치해요.')+'</small>');
    return}
  if(ios){bar('<b>'+appName+' 앱으로 설치</b><small>아래쪽 공유 버튼 <span aria-hidden="true">⬆︎</span> → <b style="display:inline">홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</small>');return}
  var deferred=null,shown=null;
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(!shown)shown=bar('<b>'+appName+' 앱으로 설치</b><small>홈 화면에 아이콘이 생겨요.</small>','설치',function(d){deferred.prompt();deferred.userChoice.finally(function(){d.remove()})})});
  setTimeout(function(){if(!deferred&&!shown)shown=bar('<b>'+appName+' 앱으로 설치</b><small>오른쪽 위 ⋮ → <b style="display:inline">홈 화면에 추가</b>(또는 앱 설치)를 눌러요.</small>')},2500);
})();

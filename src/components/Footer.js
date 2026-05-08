import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoBlack}>한결</span>
            <span className={styles.logoGold}>부동산</span>
          </div>
          <p>
            한결부동산공인중개사사무소<br />
            대표 이동한<br />
            부산광역시 남구 대연동 368-1<br />
            등록번호 제26290-2019-00094호<br />
            <a href="tel:051-612-5155">☎ 051-612-5155</a>
          </p>
        </div>

        <div className={styles.contact}>
          <h4>담당자 직통 연락</h4>
          <p className={styles.manager}>친절한 한민희 부장</p>
          <p>
            <a href="tel:010-4706-8253">📱 010-4706-8253</a><br />
            <a href="mailto:zsaza@naver.com">✉ zsaza@naver.com</a>
          </p>
        </div>

        <div className={styles.links}>
          <h4>바로가기</h4>
          <ul>
            <li><Link href="/properties">매물 찾기</Link></li>
            <li><Link href="/about">사무소 소개</Link></li>
            <li><Link href="/contact">상담 문의</Link></li>
            <li>
              <a href="https://blog.naver.com/zsaza" target="_blank" rel="noopener noreferrer">
                네이버 블로그
              </a>
            </li>
            <li>
              <a href="https://qr.kakao.com/talk/WqwGd.I9B" target="_blank" rel="noopener noreferrer">
                카카오톡 1:1 상담
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} 한결부동산공인중개사사무소. All rights reserved.</p>
        <p>공인중개사 이동한 | 사업자등록번호 제26290-2019-00094호</p>
      </div>
    </footer>
  );
}

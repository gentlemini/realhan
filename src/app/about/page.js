import KakaoMap from '@/components/KakaoMap';
import styles from './about.module.css';

export const metadata = {
  title: '사무소 소개 | 한결부동산',
  description: '부산광역시 남구 대연동 한결부동산공인중개사사무소 소개. 친절한 한민희 부장.',
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.badge}>About Us</p>
          <h1 className={styles.title}>한결부동산을<br />소개합니다</h1>
          <p className={styles.subtitle}>
            부산 남구 대연동에서 고객과 함께 성장해온<br />
            신뢰할 수 있는 공인중개사사무소입니다.
          </p>
        </div>
      </div>

      <div className={styles.content}>

        {/* 1. 프로필 카드 */}
        <div className={styles.profileSection}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              <img src="/profile.png" alt="한민희 부장" className={styles.avatarImg} />
            </div>
            <div className={styles.profileInfo}>
              <h2 className={styles.profileName}>친절한 공인중개사 한민희 부장</h2>
              <p className={styles.profileRole}>부동산 전담 매니저</p>
              <div className={styles.contactList}>
                <a href="tel:010-4706-8253" className={styles.contactItem}>📱 010-4706-8253</a>
                <a href="tel:051-612-5155" className={styles.contactItem}>☎ 051-612-5155</a>
                <a href="mailto:zsaza@naver.com" className={styles.contactItem}>✉ zsaza@naver.com</a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 자격 및 경력 */}
        <div className={styles.careerSection}>
          <h2 className={styles.sectionTitle}>자격 및 경력</h2>

          <div className={styles.licenseRow}>
            <div className={styles.licenseCard}>
              <span className={styles.licenseIcon}>🏅</span>
              <div>
                <p className={styles.licenseTitle}>제28회 공인중개사</p>
                <p className={styles.licenseDesc}>국가공인 자격증</p>
              </div>
            </div>
            <div className={styles.licenseCard}>
              <span className={styles.licenseIcon}>🏗</span>
              <div>
                <p className={styles.licenseTitle}>실내건축기사</p>
                <p className={styles.licenseDesc}>주거 · 상업 전문</p>
              </div>
            </div>
          </div>

          <div className={styles.timeline}>
            {[
              { label: '건축자재 판매', desc: '영업 부장 근무' },
              { label: '수영강사', desc: '생활체육지도사 2급' },
              { label: '카페 바리스타', desc: '매니저 근무' },
              { label: '카페 프랜차이즈', desc: '슈퍼바이저 · 창업교육' },
              { label: '자동차정비사', desc: '정비소 근무' },
            ].map((item, i) => (
              <div key={i} className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineBefore}>前</span>
                  <strong className={styles.timelineLabel}>{item.label}</strong>
                  <span className={styles.timelineDesc}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.slogan}>
            <p>"이것저것 많이 할 줄 아는 공인중개사"</p>
          </div>
        </div>

        {/* 3. 사무소 정보 + 전문 분야 */}
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>사무소 정보</h3>
            <table className={styles.infoTable}>
              <tbody>
                <tr><th>사무소명</th><td>한결부동산공인중개사사무소</td></tr>
                <tr><th>대표</th><td>이동한</td></tr>
                <tr><th>소재지</th><td>부산광역시 남구 대연동 368-1</td></tr>
                <tr><th>등록번호</th><td>제26290-2019-00094호</td></tr>
                <tr><th>사무소 전화</th><td>051-612-5155</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.infoCard}>
            <h3>전문 분야</h3>
            <div className={styles.specialties}>
              {['아파트', '빌라', '원룸', '오피스텔', '상가', '토지', '빌딩'].map((s) => (
                <span key={s} className={styles.specialty}>{s}</span>
              ))}
            </div>
            <p className={styles.specialtyDesc}>
              부산 남구를 중심으로 다양한 유형의 매물을 전문적으로 중개합니다.
              매매, 전세, 월세 모든 거래 유형에 대응 가능합니다.
            </p>
          </div>
        </div>

        {/* 4. 오시는 길 */}
        <div className={styles.mapSection}>
          <h2 className={styles.sectionTitle}>오시는 길</h2>
          <div className={styles.mapWrap}>
            <KakaoMap address="부산광역시 남구 대연동 368-1" radius={30} />
          </div>
          <p className={styles.mapDesc}>
            📍 부산광역시 남구 대연동 368-1 | 대중교통 이용 가능
          </p>
        </div>

        {/* 5. 외부 채널 */}
        <div className={styles.channelSection}>
          <h2 className={styles.sectionTitle}>외부 채널</h2>
          <div className={styles.channels}>
            <a href="https://blog.naver.com/zsaza" target="_blank" rel="noopener noreferrer" className={styles.channel}>
              <span className={styles.channelIcon} style={{ background: '#03c75a' }}>N</span>
              <div>
                <p className={styles.channelName}>네이버 블로그</p>
                <p className={styles.channelDesc}>매물 정보 및 부동산 소식</p>
              </div>
            </a>
            <a href="https://pf.kakao.com/_QaxliG" target="_blank" rel="noopener noreferrer" className={styles.channel}>
              <span className={styles.channelIcon} style={{ background: '#fee500', color: '#000' }}>💬</span>
              <div>
                <p className={styles.channelName}>카카오톡 1:1 상담</p>
                <p className={styles.channelDesc}>실시간 문의 및 상담</p>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

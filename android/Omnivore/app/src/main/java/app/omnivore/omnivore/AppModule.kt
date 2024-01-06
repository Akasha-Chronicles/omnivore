package app.omnivore.omnivore

import android.content.Context
import app.omnivore.omnivore.dataService.DataService
import app.omnivore.omnivore.networking.Networker
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

  @Singleton
  @Provides
  fun provideDataStoreRepository(
    @ApplicationContext app: Context
  ): DatastoreRepository = OmnivoreDatastore(app)

  @Singleton
  @Provides
  fun provideNetworker(datastore: DatastoreRepository) = Networker(datastore)

  @Singleton
  @Provides
  fun provideAnalytics(@ApplicationContext app: Context) = EventTracker(app)

  @Singleton
  @Provides
  fun provideDataService(
    @ApplicationContext app: Context,
    networker: Networker
  ) = DataService(app, networker)
}
